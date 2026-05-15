// import { Document } from "@langchain/core/documents";
// import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
// import { PDFParse } from "pdf-parse";
// import { NextResponse } from "next/server";

// import { isPdfFile } from "@/utils/is-pdf-file";

// /**
//  * Forces this route to run on the Node.js runtime.
//  *
//  * PDF parsing libraries rely on Node.js APIs like Buffers and file handling,
//  * which are not available in the Edge runtime.
//  */
// export const runtime = "nodejs";

// /**
//  * Upload and process a PDF file.
//  *
//  * Flow:
//  * 1. Validate uploaded file
//  * 2. Extract text from PDF
//  * 3. Convert pages into LangChain documents
//  * 4. Split large text into smaller chunks
//  * 5. Return chunk information
//  *
//  * This is the first stage of a RAG pipeline:
//  *
//  * PDF → Extract Text → Chunk Text
//  */
// export async function POST(request: Request) {
//   try {
//     /**
//      * Read multipart/form-data from the incoming request.
//      *
//      * Since the frontend sends a file using FormData,
//      * we need to parse it here.
//      */
//     const formData = await request.formData();

//     /**
//      * Get the uploaded file from the "file" field.
//      */
//     const file = formData.get("file");

//     /**
//      * Ensure the uploaded value is actually a File object.
//      *
//      * This prevents invalid payloads and protects the API
//      * from unexpected request structures.
//      */
//     if (!(file instanceof File)) {
//       return NextResponse.json(
//         { error: "Please choose a PDF file to upload." },
//         { status: 400 },
//       );
//     }

//     /**
//      * Only allow PDF files.
//      *
//      * RAG systems usually support multiple document types later
//      * (PDF, DOCX, TXT, HTML, etc.), but for now we only handle PDFs.
//      */
//     if (!isPdfFile(file)) {
//       return NextResponse.json(
//         { error: "Only PDF files are allowed." },
//         { status: 400 },
//       );
//     }

//     /**
//      * Convert browser File object into Uint8Array.
//      *
//      * PDF parsers work with raw binary data instead of browser File objects.
//      */
//     const data = new Uint8Array(await file.arrayBuffer());

//     /**
//      * Initialize PDF parser with binary PDF data.
//      *
//      * We are using pdf-parse directly instead of LangChain's PDFLoader
//      * because PDFLoader can sometimes have issues with Next.js/Turbopack.
//      */
//     const parser = new PDFParse({ data });

//     try {
//       /**
//        * Extract all readable text from the PDF.
//        *
//        * The result contains:
//        * - page text
//        * - page numbers
//        * - metadata
//        */
//       const textResult = await parser.getText();

//       /**
//        * Array of LangChain documents.
//        *
//        * Each document represents one PDF page.
//        */
//       const docs: Document[] = [];

//       /**
//        * Loop through every extracted page.
//        */
//       for (const page of textResult.pages) {
//         /**
//          * Remove unnecessary whitespace.
//          */
//         const text = page.text?.trim();

//         /**
//          * Skip completely empty pages.
//          *
//          * Some PDFs contain blank pages or pages without readable text.
//          */
//         if (!text) continue;

//         /**
//          * Convert page into LangChain Document format.
//          *
//          * LangChain standardizes document structure using:
//          * - pageContent → actual text
//          * - metadata → additional information
//          *
//          * Metadata becomes VERY useful later in RAG systems for:
//          * - citations
//          * - source tracking
//          * - page references
//          * - filtering
//          */
//         docs.push(
//           new Document({
//             pageContent: text,
//             metadata: {
//               source: file.name,
//               loc: { pageNumber: page.num },
//             },
//           }),
//         );
//       }

//       /**
//        * If no readable text was extracted,
//        * the PDF may:
//        * - contain only images
//        * - be scanned
//        * - be encrypted/protected
//        */
//       if (docs.length === 0) {
//         return NextResponse.json(
//           {
//             error:
//               "No readable text was found in this PDF. It may be image-only or protected.",
//           },
//           { status: 400 },
//         );
//       }

//       /**
//        * Split large documents into smaller chunks.
//        *
//        * Why chunking matters:
//        * - LLMs cannot efficiently process huge documents
//        * - Smaller chunks improve retrieval quality
//        * - Smaller chunks reduce token cost
//        *
//        * chunkSize:
//        * Maximum characters allowed per chunk.
//        *
//        * chunkOverlap:
//        * Repeats a small portion of previous chunk
//        * to avoid losing context between chunks.
//        */
//       const splitter = new RecursiveCharacterTextSplitter({
//         chunkSize: 500,
//         chunkOverlap: 50,
//       });

//       /**
//        * Split all documents into smaller chunks.
//        *
//        * Example:
//        * One page
//        * → multiple searchable chunks
//        */
//       const chunks = await splitter.splitDocuments(docs);

//       /**
//        * Server-side debugging logs.
//        *
//        * These logs appear in:
//        * terminal running `pnpm dev`
//        */
//       console.log("PDF pages:", docs.length);
//       console.log("Total chunks:", chunks.length);
//       console.log("First chunk:", chunks[0]?.pageContent);

//       /**
//        * Return success response.
//        *
//        * We only return preview data for now.
//        * Later we will:
//        * - create embeddings
//        * - store chunks in vector DB
//        * - enable semantic search
//        */
//       return NextResponse.json({
//         message: "PDF uploaded and chunked successfully.",
//         pages: docs.length,
//         chunks: chunks.length,

//         /**
//          * Return first few chunks so frontend
//          * can verify extraction worked correctly.
//          */
//         preview: chunks.slice(0, 3).map((chunk) => ({
//           content: chunk.pageContent,
//           metadata: chunk.metadata,
//         })),
//       });
//     } finally {
//       /**
//        * Clean up parser resources.
//        *
//        * Important for memory management,
//        * especially when processing large PDFs.
//        */
//       await parser.destroy();
//     }
//   } catch (error) {
//     /**
//      * Log full server error for debugging.
//      */
//     console.error("PDF upload error:", error);

//     /**
//      * Only expose detailed debug information
//      * during local development.
//      *
//      * Never expose internal server errors
//      * in production environments.
//      */
//     const debug =
//       process.env.NODE_ENV === "development" && error instanceof Error
//         ? { debug: error.message }
//         : {};

//     /**
//      * Return safe error response to frontend.
//      */
//     return NextResponse.json(
//       {
//         error: "We could not read that PDF. Try another file.",
//         ...debug,
//       },
//       { status: 500 },
//     );
//   }
// }

import { TaskType } from "@google/generative-ai";
import { Document } from "@langchain/core/documents";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { createClient } from "@supabase/supabase-js";
import { PDFParse } from "pdf-parse";
import { NextResponse } from "next/server";

import { isPdfFile } from "@/utils/is-pdf-file";

export const runtime = "nodejs";

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

      const retryMatch = err instanceof Error && err.message.match(/retryDelay["\s:]+(\d+)s/);
      const waitMs = retryMatch ? parseInt(retryMatch[1]) * 1000 : (attempt + 1) * 10_000;
      console.warn(`Rate limited — retrying in ${waitMs / 1000}s (attempt ${attempt + 1}/${maxRetries})`);
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
              loc: { pageNumber: page.num },
            },
          }),
        );
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
          { error: "Missing Supabase or Google environment variables." },
          { status: 500 },
        );
      }

      const supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);

      const embeddings = new GoogleGenerativeAIEmbeddings({
        apiKey: googleApiKey,
        model: "gemini-embedding-001",
        taskType: TaskType.RETRIEVAL_DOCUMENT,
      });

      // Sanitize: PostgreSQL rejects null bytes and lone surrogates
      const sanitizedChunks = chunks
        .map((chunk) => ({
          content: chunk.pageContent
            .replace(/\u0000/g, "")
            .replace(/[\uD800-\uDFFF]/g, ""),
          metadata: chunk.metadata,
        }))
        .filter((chunk) => chunk.content.trim().length > 0);

      console.log("Sanitized chunks:", sanitizedChunks.length);

      const rows = [];
      for (const chunk of sanitizedChunks) {
        const embedding = await embedOneWithRetry(embeddings, chunk.content);
        if (embedding.length) {
          rows.push({ content: chunk.content, metadata: chunk.metadata, embedding });
        }
      }

      console.log("Embeddings returned:", rows.length);

      for (let index = 0; index < rows.length; index += INSERT_BATCH_SIZE) {
        const batch = rows.slice(index, index + INSERT_BATCH_SIZE);

        const { error: insertError } = await supabaseClient
          .from("documents")
          .insert(batch);

        if (insertError) {
          throw new Error(`Supabase insert failed: ${insertError.message}`);
        }
      }

      console.log("PDF pages:", docs.length);
      console.log("Total chunks:", chunks.length);
      console.log("Saved chunks:", rows.length);
      console.log("First chunk:", chunks[0]?.pageContent);

      return NextResponse.json({
        message: "PDF uploaded, chunked, embedded, and saved successfully.",
        pages: docs.length,
        chunks: chunks.length,
        savedChunks: rows.length,
        preview: chunks.slice(0, 3).map((chunk) => ({
          content: chunk.pageContent,
          metadata: chunk.metadata,
        })),
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