import { TaskType } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatGroq } from "@langchain/groq";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

export const runtime = "nodejs";
export const maxDuration = 30;

type MatchedChunk = { content: string; metadata: Record<string, unknown>; similarity: number };
type ChatMessage = { role: "user" | "assistant"; content: string };
type AskAgentRequest = {
  messages?: ChatMessage[];
  sourceId?: string;
};

const MAX_HISTORY_MESSAGES = 8;

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
    const { messages, sourceId } = (await request.json()) as AskAgentRequest;
    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: "Conversation messages are required." }, { status: 400 });
    }

    const lastMessage = messages.at(-1);
    const query = lastMessage?.role === "user" ? lastMessage.content : undefined;
    const history = messages
      .slice(0, -1)
      .filter(
        (message): message is ChatMessage =>
          message != null &&
          (message.role === "user" || message.role === "assistant") &&
          typeof message.content === "string",
      )
      .slice(-MAX_HISTORY_MESSAGES);

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

    const rpcArgs = {
      query_embedding: queryEmbedding,
      match_count: 5,
      match_threshold: 0.3,
    } as const;

    const runMatchQuery = async (matchSourceId?: string) => {
      const { data, error } = await supabase.rpc("match_documents", {
        ...rpcArgs,
        ...(matchSourceId ? { match_source_id: matchSourceId } : {}),
      });

      if (error) {
        throw error;
      }

      return (data as MatchedChunk[]) ?? [];
    };

    const safeSourceId = typeof sourceId === "string" && sourceId.trim() ? sourceId.trim() : null;

    let matchedChunks: MatchedChunk[] = [];

    try {
      matchedChunks = safeSourceId ? await runMatchQuery(safeSourceId) : await runMatchQuery();
    } catch (matchError) {
      if (safeSourceId) {
        console.warn("Source-scoped match failed, retrying without source filter:", matchError);
        matchedChunks = await runMatchQuery();
      } else {
        throw matchError;
      }
    }

    if (safeSourceId && matchedChunks.length === 0) {
      const { count, error: countError } = await supabase
        .from("documents")
        .select("id", { count: "exact", head: true })
        .contains("metadata", { source_id: safeSourceId });

      if (!countError && (count ?? 0) === 0) {
        matchedChunks = await runMatchQuery();
      }
    }

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
      model: "openai/gpt-oss-120b",
      streaming: true,
    });

    const historyMessages = history.map((message) =>
      message.role === "user"
        ? new HumanMessage(message.content)
        : new AIMessage(message.content),
    );

    const langchainMessages = [
      new SystemMessage(
        `Answer the user's question using ONLY the document context below. Use the conversation history only to resolve follow-up references like "it", "that page", or "the second item". When you use information from the context, cite the source inline using bracket notation like [1], [2], etc. matching the reference numbers. You may use multiple citations. If the answer isn't in the context, say "I don't have that information."\n\nDocument context:\n${context || "No context available."}`
      ),
      ...historyMessages,
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
