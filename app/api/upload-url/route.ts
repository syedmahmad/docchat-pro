import { TaskType } from "@google/generative-ai";
import { Document } from "@langchain/core/documents";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { createClient } from "@supabase/supabase-js";
import { PDFParse } from "pdf-parse";
import { NextResponse } from "next/server";

import { MAX_URL_CONTENT_CHARS } from "@/constants/url-upload";
import { assertPublicHttpUrl } from "@/utils/safe-remote-url";

export const runtime = "nodejs";
export const maxDuration = 60;

const INSERT_BATCH_SIZE = 50;
const MAX_URL_FETCH_BYTES = 20 * 1024 * 1024;
const MAX_REDIRECTS = 3;

function extractTextFromHtml(html: string): string {
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ");
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ");
  text = text.replace(/<[^>]+>/g, " ");
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
  return text.replace(/\s+/g, " ").trim();
}

async function embedOneWithRetry(
  embeddings: GoogleGenerativeAIEmbeddings,
  text: string,
  maxRetries = 3,
): Promise<number[]> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await embeddings.embedQuery(text);
      if (!result.length) {
        throw new Error("429 Too Many Requests: embedding returned empty (quota likely exceeded)");
      }
      return result;
    } catch (err: unknown) {
      const isRateLimit =
        err instanceof Error &&
        (err.message.includes("429") || err.message.includes("Too Many Requests"));

      if (!isRateLimit || attempt === maxRetries - 1) throw err;

      const retryMatch =
        err instanceof Error && err.message.match(/retryDelay["\s:]+(\d+)s/);
      const waitMs = retryMatch ? parseInt(retryMatch[1]) * 1000 : (attempt + 1) * 10_000;

      console.warn(
        `Rate limited — retrying in ${waitMs / 1000}s (attempt ${attempt + 1}/${maxRetries})`,
      );
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  return [];
}

async function fetchWithRedirectGuard(initialUrl: URL): Promise<Response> {
  let currentUrl = new URL(initialUrl);

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
    await assertPublicHttpUrl(currentUrl);

    const response = await fetch(currentUrl, {
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; DocChatBot/1.0; +https://docchat.pro)",
      },
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        throw new Error("Redirect response did not include a location header.");
      }

      currentUrl = new URL(location, currentUrl);
      continue;
    }

    return response;
  }

  throw new Error("Too many redirects.");
}

function getContentLengthBytes(response: Response): number | null {
  const raw = response.headers.get("content-length");
  if (!raw) return null;

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: unknown };
    const submittedUrl = body.url;

    if (typeof submittedUrl !== "string" || !submittedUrl.trim()) {
      return NextResponse.json(
        { error: "Please provide a valid URL in the request body." },
        { status: 400 },
      );
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(submittedUrl.trim());
    } catch {
      return NextResponse.json(
        {
          error:
            "The URL you entered is not valid. Please use a full URL like https://example.com.",
        },
        { status: 400 },
      );
    }

    await assertPublicHttpUrl(parsedUrl);

    const fetchResponse = await fetchWithRedirectGuard(parsedUrl);

    if (!fetchResponse.ok) {
      return NextResponse.json(
        {
          error: `Could not fetch the URL (HTTP ${fetchResponse.status}). Make sure the page is publicly accessible.`,
        },
        { status: 400 },
      );
    }

    const contentLength = getContentLengthBytes(fetchResponse);
    if (contentLength != null && contentLength > MAX_URL_FETCH_BYTES) {
      return NextResponse.json(
        {
          error: `That page is too large to ingest. Maximum fetch size is ${Math.round(
            MAX_URL_FETCH_BYTES / (1024 * 1024),
          )} MB.`,
        },
        { status: 413 },
      );
    }

    const finalUrl = new URL(fetchResponse.url || parsedUrl.toString());
    const contentType = fetchResponse.headers.get("content-type") ?? "";
    const isPdf = contentType.includes("application/pdf") || finalUrl.pathname.toLowerCase().endsWith(".pdf");
    const sourceId = crypto.randomUUID();
    const docs: Document[] = [];

    if (isPdf) {
      const arrayBuffer = await fetchResponse.arrayBuffer();
      if (arrayBuffer.byteLength > MAX_URL_FETCH_BYTES) {
        return NextResponse.json(
          {
            error: `That PDF is too large to ingest. Maximum fetch size is ${Math.round(
              MAX_URL_FETCH_BYTES / (1024 * 1024),
            )} MB.`,
          },
          { status: 413 },
        );
      }

      const parser = new PDFParse({ data: new Uint8Array(arrayBuffer) });
      try {
        const textResult = await parser.getText();

        for (const page of textResult.pages) {
          const text = page.text?.trim();
          if (!text) continue;

          docs.push(
            new Document({
              pageContent: text,
              metadata: {
                source: finalUrl.toString(),
                source_id: sourceId,
                source_label: finalUrl.toString(),
                source_kind: "url-pdf",
                loc: { pageNumber: page.num },
              },
            }),
          );
        }
      } finally {
        await parser.destroy();
      }

      if (docs.length === 0) {
        return NextResponse.json(
          {
            error:
              "No readable text was found in this PDF. It may be image-only or protected.",
          },
          { status: 400 },
        );
      }
    } else {
      const rawHtml = await fetchResponse.text();
      const htmlBytes = new TextEncoder().encode(rawHtml).byteLength;
      if (htmlBytes > MAX_URL_FETCH_BYTES) {
        return NextResponse.json(
          {
            error: `That page is too large to ingest. Maximum fetch size is ${Math.round(
              MAX_URL_FETCH_BYTES / (1024 * 1024),
            )} MB.`,
          },
          { status: 413 },
        );
      }

      const plainText = extractTextFromHtml(rawHtml).slice(0, MAX_URL_CONTENT_CHARS);
      if (!plainText) {
        return NextResponse.json(
          {
            error:
              "We could not extract any readable text from this page. It may require JavaScript to render.",
          },
          { status: 400 },
        );
      }

      docs.push(
        new Document({
          pageContent: plainText,
          metadata: {
            source: finalUrl.toString(),
            source_id: sourceId,
            source_label: finalUrl.toString(),
            source_kind: "web-page",
            loc: { pageNumber: 1 },
          },
        }),
      );
    }

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 500,
      chunkOverlap: 50,
    });

    const chunks = await splitter.splitDocuments(docs);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const googleApiKey = process.env.GOOGLE_API_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey || !googleApiKey) {
      return NextResponse.json(
        { error: "Server configuration error: missing Supabase or Google API keys." },
        { status: 500 },
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);
    const embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: googleApiKey,
      model: "gemini-embedding-001",
      taskType: TaskType.RETRIEVAL_DOCUMENT,
    });

    const sanitizedChunks = chunks
      .map((chunk) => ({
        content: chunk.pageContent.replace(/\u0000/g, "").replace(/[\uD800-\uDFFF]/g, ""),
        metadata: chunk.metadata,
      }))
      .filter((chunk) => chunk.content.trim().length > 0);

    const rows: Array<{
      content: string;
      metadata: Record<string, unknown>;
      embedding: number[];
    }> = [];

    for (const chunk of sanitizedChunks) {
      const embedding = await embedOneWithRetry(embeddings, chunk.content);
      if (embedding.length) {
        rows.push({
          content: chunk.content,
          metadata: chunk.metadata,
          embedding,
        });
      }
    }

    for (let index = 0; index < rows.length; index += INSERT_BATCH_SIZE) {
      const batch = rows.slice(index, index + INSERT_BATCH_SIZE);
      const { error: insertError } = await supabaseClient.from("documents").insert(batch);

      if (insertError) {
        throw new Error(`Supabase insert failed: ${insertError.message}`);
      }
    }

    return NextResponse.json({
      message: "URL ingested and saved successfully.",
      pages: docs.length,
      chunks: rows.length,
      savedChunks: rows.length,
      sourceId,
    });
  } catch (error) {
    console.error("URL upload error:", error);

    const debug =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? { debug: error.message }
        : {};

    return NextResponse.json(
      {
        error:
          "We could not process that URL. Make sure it is publicly accessible and try again.",
        ...debug,
      },
      { status: 500 },
    );
  }
}
