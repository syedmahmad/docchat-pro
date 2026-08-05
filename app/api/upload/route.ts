import { TaskType } from "@google/generative-ai";
import { Document } from "@langchain/core/documents";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { createClient } from "@supabase/supabase-js";
import { PDFParse } from "pdf-parse";
import { NextResponse } from "next/server";

import { MAX_BYTES } from "@/constants/pdf-upload";
import { isPdfFile } from "@/utils/is-pdf-file";

export const runtime = "nodejs";
export const maxDuration = 60;

const INSERT_BATCH_SIZE = 50;

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

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Please choose a PDF file to upload." },
        { status: 400 },
      );
    }

    if (!isPdfFile(file)) {
      return NextResponse.json(
        { error: "Only PDF files are allowed." },
        { status: 400 },
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: "This file appears to be empty." },
        { status: 400 },
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        {
          error: `File is too large. Maximum size is ${Math.round(MAX_BYTES / (1024 * 1024))} MB.`,
        },
        { status: 413 },
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const googleApiKey = process.env.GOOGLE_API_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey || !googleApiKey) {
      return NextResponse.json(
        { error: "Missing Supabase or Google environment variables." },
        { status: 500 },
      );
    }

    const sourceId = crypto.randomUUID();
    const data = new Uint8Array(await file.arrayBuffer());
    const parser = new PDFParse({ data });

    try {
      const textResult = await parser.getText();
      const docs: Document[] = [];

      for (const page of textResult.pages) {
        const text = page.text?.trim();
        if (!text) continue;

        docs.push(
          new Document({
            pageContent: text,
            metadata: {
              source: file.name,
              source_id: sourceId,
              source_label: file.name,
              source_kind: "pdf",
              loc: { pageNumber: page.num },
            },
          }),
        );
      }

      if (docs.length === 0) {
        return NextResponse.json(
          {
            error:
              "No readable text was found in this PDF. It may be image-only or password-protected.",
          },
          { status: 400 },
        );
      }

      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 500,
        chunkOverlap: 50,
      });

      const chunks = await splitter.splitDocuments(docs);

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
        message: "PDF uploaded, chunked, embedded, and saved successfully.",
        pages: docs.length,
        chunks: rows.length,
        savedChunks: rows.length,
        sourceId,
      });
    } finally {
      await parser.destroy();
    }
  } catch (error) {
    console.error("PDF upload error:", error);

    const debug =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? { debug: error.message }
        : {};

    return NextResponse.json(
      {
        error: "We could not read that PDF. Try another file.",
        ...debug,
      },
      { status: 500 },
    );
  }
}
