import { TaskType } from "@google/generative-ai";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { ChatGroq } from "@langchain/groq";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type MatchedChunk = { content: string; metadata: Record<string, unknown>; similarity: number };
type ChatMessage = { role: "user" | "assistant"; content: string };

function extractFilename(metadata: Record<string, unknown>): string {
  return (
    (metadata.filename as string) ??
    (metadata.source as string) ??
    (metadata.file_name as string) ??
    "document.pdf"
  );
}

function extractPageNumber(metadata: Record<string, unknown>): number | null {
  const val =
    metadata.page_number ??
    metadata.page ??
    metadata.pageNumber ??
    (metadata.loc as Record<string, unknown> | undefined)?.pageNumber;
  return typeof val === "number" ? val : val != null ? Number(val) : null;
}

function extractChunkIndex(metadata: Record<string, unknown>): number | null {
  const val = metadata.chunk_index ?? metadata.chunkIndex ?? metadata.index;
  return typeof val === "number" ? val : val != null ? Number(val) : null;
}

export async function POST(request: Request) {
  try {
    const { messages } = (await request.json()) as { messages: ChatMessage[] };
    const lastMessage = messages.at(-1);
    const query = lastMessage?.role === "user" ? lastMessage.content : undefined;

    if (!query?.trim()) {
      return Response.json({ error: "Query is required." }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const googleApiKey = process.env.GOOGLE_API_KEY;
    const groqApiKey = process.env.GROQ_API_KEY;

    if (!supabaseUrl || !supabaseKey || !googleApiKey || !groqApiKey) {
      return Response.json({ error: "Missing environment variables." }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: googleApiKey,
      model: "gemini-embedding-001",
      taskType: TaskType.RETRIEVAL_QUERY,
    });

    const queryEmbedding = await embeddings.embedQuery(query);

    const { data: chunks, error: matchError } = await supabase.rpc("match_documents", {
      query_embedding: queryEmbedding,
      match_count: 5,
      match_threshold: 0.3,
    });

    if (matchError) {
      console.error("Supabase match error:", matchError.message);
    }

    const matchedChunks = (chunks as MatchedChunk[]) ?? [];

    const citations = matchedChunks.map((c, i) => ({
      id: i + 1,
      filename: extractFilename(c.metadata),
      pageNumber: extractPageNumber(c.metadata),
      chunkIndex: extractChunkIndex(c.metadata),
      content: c.content,
    }));

    const context = matchedChunks.map((c, i) => `[${i + 1}] ${c.content}`).join("\n\n");

    const model = new ChatGroq({
      apiKey: groqApiKey,
      model: "llama-3.3-70b-versatile",
      streaming: true,
    });

    const langchainMessages = [
      new SystemMessage(
        `Answer the user's question using ONLY the context below. When you use information from the context, cite the source inline using bracket notation like [1], [2], etc. matching the reference numbers. You may use multiple citations. If the answer isn't in the context, say "I don't have that information."\n\nContext:\n${context || "No context available."}`
      ),
      new HumanMessage(query),
    ];

    const stream = await model.stream(langchainMessages);

    const citationsHeader = `CITATIONS_JSON:${JSON.stringify({ citations })}\n\n`;

    const readable = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode(citationsHeader));
        for await (const chunk of stream) {
          const text = typeof chunk.content === "string" ? chunk.content : "";
          if (text) controller.enqueue(encoder.encode(text));
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    console.error("Ask agent error:", error);
    const debug =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? { debug: error.message }
        : {};
    return Response.json({ error: "Failed to process your question.", ...debug }, { status: 500 });
  }
}
