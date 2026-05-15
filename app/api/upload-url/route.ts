/**
 * POST /api/upload-url
 *
 * Ingests a web page or PDF from a given URL into the Supabase vector store
 * so the chat agent can answer questions about its content.
 *
 * Pipeline:
 *   1. Validate the submitted URL
 *   2. Fetch the remote content (HTML or PDF)
 *   3. Extract readable text from the content
 *   4. Split the text into overlapping chunks (better retrieval quality)
 *   5. Generate an embedding vector for each chunk via Google Generative AI
 *   6. Batch-insert chunks + embeddings into Supabase "documents" table
 *   7. Return a summary (chunk count, etc.) to the frontend
 */

import { TaskType } from "@google/generative-ai";
import { Document } from "@langchain/core/documents";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { createClient } from "@supabase/supabase-js";
import { PDFParse } from "pdf-parse";
import { NextResponse } from "next/server";

import { MAX_URL_CONTENT_CHARS } from "@/constants/url-upload";

// Force Node.js runtime — we use pdf-parse (Buffer APIs) and server-only secrets.
// The Edge runtime does not support Node.js built-ins like Buffer.
export const runtime = "nodejs";

// How many rows to insert per Supabase call.
// Sending all rows at once can exceed the request-body size limit, so we batch them.
const INSERT_BATCH_SIZE = 50;

/**
 * Strips HTML tags and decodes common HTML entities to produce plain text.
 *
 * Why not use a real HTML parser?
 * We want to avoid adding new dependencies.  For the purposes of a RAG
 * knowledge base, perfect fidelity doesn't matter — we just need clean,
 * readable sentences without markup noise.
 *
 * Limitations:
 * - Navigation menus, footers, and cookie banners will still appear in the text.
 *   We strip <script>/<style> which removes the worst offenders.
 * - For most articles, documentation pages, and blog posts the output is fine.
 */
function extractTextFromHtml(html: string): string {
  // Remove <script>…</script> blocks entirely so JavaScript code doesn't pollute the text
  let text = html.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    " ",
  );

  // Remove <style>…</style> blocks — CSS selectors and rules are useless for Q&A
  text = text.replace(
    /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
    " ",
  );

  // Strip every remaining HTML tag, leaving only the text between them.
  // A space replaces each tag so words from adjacent elements don't run together.
  text = text.replace(/<[^>]+>/g, " ");

  // Decode the most common HTML entities to their readable character equivalents
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " "); // non-breaking space → regular space

  // Collapse consecutive whitespace (spaces, tabs, newlines) into a single space
  // so the text splitter sees clean sentence boundaries
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

/**
 * Embeds a single text string with automatic retry on Google rate-limit errors.
 *
 * Why retry?
 * The free tier of Google Generative AI enforces a requests-per-minute quota.
 * When we embed many chunks back-to-back we sometimes hit a 429.  Waiting
 * and retrying is the recommended approach from Google's documentation.
 *
 * Returns an empty array only after all retries are exhausted, so callers
 * can skip that chunk rather than crashing the entire upload.
 */
async function embedOneWithRetry(
  embeddings: GoogleGenerativeAIEmbeddings,
  text: string,
  maxRetries = 3,
): Promise<number[]> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Request the embedding vector for this chunk of text
      const result = await embeddings.embedQuery(text);

      // An empty array means the quota was silently exceeded — treat it like a 429
      if (!result.length) {
        throw new Error(
          "429 Too Many Requests: embedding returned empty (quota likely exceeded)",
        );
      }

      // Got a valid embedding — return it immediately without retrying
      return result;
    } catch (err: unknown) {
      // Check whether this error is a rate-limit response so we know whether to retry
      const isRateLimit =
        err instanceof Error &&
        (err.message.includes("429") ||
          err.message.includes("Too Many Requests"));

      // If it's not a rate-limit error, or we've run out of retries, propagate the error
      if (!isRateLimit || attempt === maxRetries - 1) throw err;

      // Try to read the server-suggested retry delay from the error message
      const retryMatch =
        err instanceof Error && err.message.match(/retryDelay["\s:]+(\d+)s/);

      // Fall back to exponential back-off (10 s, 20 s, 30 s …) if no delay is specified
      const waitMs = retryMatch
        ? parseInt(retryMatch[1]) * 1000
        : (attempt + 1) * 10_000;

      console.warn(
        `Rate limited — retrying in ${waitMs / 1000}s (attempt ${attempt + 1}/${maxRetries})`,
      );

      // Wait before the next attempt so we respect the rate limit window
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  // TypeScript requires a return here; in practice the loop always throws or returns above
  return [];
}

/**
 * Main handler — receives { url } in the JSON body and runs the full ingestion pipeline.
 */
export async function POST(request: Request) {
  try {
    // Parse the JSON body — we expect { url: string }
    const body = (await request.json()) as { url?: unknown };

    // Extract and validate the submitted URL from the parsed body
    const submittedUrl = body.url;

    // Reject missing or non-string values before attempting a network fetch
    if (typeof submittedUrl !== "string" || !submittedUrl.trim()) {
      return NextResponse.json(
        { error: "Please provide a valid URL in the request body." },
        { status: 400 },
      );
    }

    // Trim surrounding whitespace — users often paste URLs with a trailing space
    const url = submittedUrl.trim();

    // Validate that the URL is a well-formed http/https address
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json(
        {
          error:
            "The URL you entered is not valid. Please use a full URL like https://example.com.",
        },
        { status: 400 },
      );
    }

    // Block non-http/https protocols (ftp://, file://, javascript://, etc.)
    // to prevent server-side request forgery (SSRF) and other security issues
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return NextResponse.json(
        { error: "Only http and https URLs are supported." },
        { status: 400 },
      );
    }

    // Fetch the remote resource.
    // A 10-second timeout prevents slow servers from blocking the API route indefinitely.
    const fetchResponse = await fetch(url, {
      signal: AbortSignal.timeout(10_000), // abort after 10 s
      headers: {
        // Identify ourselves as a browser-like client to avoid bot-detection blocks
        "User-Agent":
          "Mozilla/5.0 (compatible; DocChatBot/1.0; +https://docchat.pro)",
      },
    });

    // Non-2xx means the page doesn't exist or the server refused — tell the user
    if (!fetchResponse.ok) {
      return NextResponse.json(
        {
          error: `Could not fetch the URL (HTTP ${fetchResponse.status}). Make sure the page is publicly accessible.`,
        },
        { status: 400 },
      );
    }

    // Read the Content-Type header to decide whether the URL points to a PDF or a web page.
    // We look at the server's declaration rather than the file extension
    // because extensions are unreliable (e.g. a ".aspx" route can serve a PDF).
    const contentType = fetchResponse.headers.get("content-type") ?? "";
    const isPdf = contentType.includes("application/pdf");

    // -----------------------------------------------------------------------
    // Build LangChain Document objects from the fetched content
    // -----------------------------------------------------------------------
    const docs: Document[] = [];

    if (isPdf) {
      // ── PDF branch ────────────────────────────────────────────────────────
      // Download the full binary content into memory
      const arrayBuffer = await fetchResponse.arrayBuffer();

      // Convert to Uint8Array — the format expected by our pdf-parse wrapper
      const data = new Uint8Array(arrayBuffer);

      // Initialise the PDF parser with the raw binary data
      const parser = new PDFParse({ data });

      try {
        // Run text extraction — returns one entry per page in the PDF
        const textResult = await parser.getText();

        for (const page of textResult.pages) {
          // Remove leading/trailing whitespace from each page's extracted text
          const text = page.text?.trim();

          // Skip blank pages — they carry no useful information for the RAG system
          if (!text) continue;

          // Wrap each page in a LangChain Document so the text splitter can process it.
          // The metadata fields (source, pageNumber) become searchable in Supabase
          // and are used by the chat agent to show citations.
          docs.push(
            new Document({
              pageContent: text,
              metadata: {
                source: url, // full URL stored as the "filename" for citations
                loc: { pageNumber: page.num }, // actual page number from the PDF
                type: "pdf-url", // lets us filter by ingestion method later
              },
            }),
          );
        }
      } finally {
        // Always free the parser's internal memory, even if an error occurred above
        await parser.destroy();
      }

      // If extraction produced no text, the PDF is likely scanned (image-only)
      if (docs.length === 0) {
        return NextResponse.json(
          {
            error:
              "No readable text was found in this PDF. It may be image-only or password-protected.",
          },
          { status: 400 },
        );
      }
    } else {
      // ── HTML branch ───────────────────────────────────────────────────────
      // Read the response body as text (HTML markup)
      const rawHtml = await fetchResponse.text();

      // Strip tags, remove scripts/styles, and decode HTML entities
      const plainText = extractTextFromHtml(rawHtml);

      // Reject pages that yield no readable text (e.g. JavaScript-only SPAs
      // that need a headless browser to render their content)
      if (!plainText) {
        return NextResponse.json(
          {
            error:
              "We could not extract any readable text from this page. It may require JavaScript to render.",
          },
          { status: 400 },
        );
      }

      // Cap at MAX_URL_CONTENT_CHARS to control embedding cost for very large pages.
      // Content beyond this limit is dropped rather than truncated mid-sentence —
      // the splitter below will handle the boundary naturally.
      const capped = plainText.slice(0, MAX_URL_CONTENT_CHARS);

      // Wrap the entire page as a single LangChain Document.
      // Unlike PDFs we don't have natural page boundaries, so we treat the
      // whole page as "page 1" and let the text splitter create the chunks.
      docs.push(
        new Document({
          pageContent: capped,
          metadata: {
            source: url, // full URL used as the "filename" for citations
            loc: { pageNumber: 1 }, // web pages don't have pages; 1 is the convention
            type: "web-page", // lets us filter by ingestion method later
          },
        }),
      );
    }

    // -----------------------------------------------------------------------
    // Split documents into smaller overlapping chunks
    // -----------------------------------------------------------------------
    // chunkSize:    max characters per chunk — small enough for the embedding model
    // chunkOverlap: repeated characters at chunk boundaries so context isn't lost
    //               when a sentence is split across two chunks
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 500,
      chunkOverlap: 50,
    });

    // Run the splitter — one large Document becomes many smaller Documents
    const chunks = await splitter.splitDocuments(docs);

    // -----------------------------------------------------------------------
    // Read environment variables — fail fast if any are missing
    // -----------------------------------------------------------------------
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const googleApiKey = process.env.GOOGLE_API_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey || !googleApiKey) {
      return NextResponse.json(
        { error: "Server configuration error: missing Supabase or Google API keys." },
        { status: 500 },
      );
    }

    // -----------------------------------------------------------------------
    // Initialise external service clients
    // -----------------------------------------------------------------------
    // Service-role key bypasses Row Level Security so we can insert from the server
    const supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Use RETRIEVAL_DOCUMENT task type — this tells Google the embeddings will be stored
    // in a vector store for later retrieval (improves embedding quality vs. SEMANTIC_SIMILARITY)
    const embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: googleApiKey,
      model: "gemini-embedding-001",
      taskType: TaskType.RETRIEVAL_DOCUMENT,
    });

    // -----------------------------------------------------------------------
    // Sanitise chunks before embedding
    // -----------------------------------------------------------------------
    // PostgreSQL rejects null bytes ( ) and lone Unicode surrogates.
    // These can appear in scraped web content, so we strip them before inserting.
    const sanitizedChunks = chunks
      .map((chunk) => ({
        content: chunk.pageContent
          .replace(/ /g, "") // remove null bytes
          .replace(/[\uD800-\uDFFF]/g, ""), // remove lone surrogates
        metadata: chunk.metadata,
      }))
      // Drop any chunk that is empty after sanitisation — it would create a useless row
      .filter((chunk) => chunk.content.trim().length > 0);

    console.log(`URL: ${url}`);
    console.log(`Sanitized chunks: ${sanitizedChunks.length}`);

    // -----------------------------------------------------------------------
    // Generate embeddings for each chunk (with rate-limit retry)
    // -----------------------------------------------------------------------
    const rows: Array<{
      content: string;
      metadata: Record<string, unknown>;
      embedding: number[];
    }> = [];

    for (const chunk of sanitizedChunks) {
      // embedOneWithRetry handles 429 errors by waiting and retrying automatically
      const embedding = await embedOneWithRetry(embeddings, chunk.content);

      // Only include rows where we successfully got an embedding vector.
      // A chunk without an embedding cannot be retrieved via vector search.
      if (embedding.length) {
        rows.push({
          content: chunk.content,
          metadata: chunk.metadata,
          embedding,
        });
      }
    }

    console.log(`Embeddings generated: ${rows.length}`);

    // -----------------------------------------------------------------------
    // Batch-insert rows into Supabase "documents" table
    // -----------------------------------------------------------------------
    // We send INSERT_BATCH_SIZE rows per request to avoid hitting Supabase's
    // per-request payload size limit on larger ingestion jobs.
    for (let index = 0; index < rows.length; index += INSERT_BATCH_SIZE) {
      // Slice out the next batch of up to INSERT_BATCH_SIZE rows
      const batch = rows.slice(index, index + INSERT_BATCH_SIZE);

      // Insert the batch — throws if Supabase returns an error
      const { error: insertError } = await supabaseClient
        .from("documents")
        .insert(batch);

      if (insertError) {
        // Surface the Supabase error message so it appears in server logs
        throw new Error(`Supabase insert failed: ${insertError.message}`);
      }
    }

    console.log(`Saved chunks: ${rows.length}`);

    // -----------------------------------------------------------------------
    // Return a success summary to the frontend
    // -----------------------------------------------------------------------
    // The frontend's parseUploadResponse reads `message`, `pages`, and `chunks`
    // to build the human-readable success detail shown in the status banner.
    return NextResponse.json({
      message: "URL ingested and saved successfully.",
      pages: docs.length, // number of logical "pages" (1 for HTML, N for PDFs)
      chunks: rows.length, // number of chunks saved to the vector store
      savedChunks: rows.length,
    });
  } catch (error) {
    // Log the full error server-side for debugging
    console.error("URL upload error:", error);

    // Only expose the raw error message during local development.
    // In production we return a generic message to avoid leaking internals.
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
