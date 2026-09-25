# Architecture & Data Flow

DocChat Pro has two distinct flows: **ingestion** (PDF → vector store) and **retrieval** (question → cited answer). Both share the same Supabase `documents` table as their storage backbone.

Each upload gets a `source_id` stored in chunk metadata. Chat requests carry the active `source_id`, so retrieval stays scoped to the most recently ingested document or URL unless the app falls back to legacy unscoped data.

---

## High-level overview

```
┌─────────────────────────────────────────────────────────┐
│                        Browser                          │
│                                                         │
│  ┌──────────────┐          ┌──────────────────────────┐ │
│  │  / (upload)  │  ──────► │  /chat (conversation)    │ │
│  │  PdfUpload   │          │  Chat + CitationChips     │ │
│  └──────┬───────┘          └──────────────┬───────────┘ │
│         │ POST /api/upload                │ POST /api/ask-agent
└─────────┼─────────────────────────────────┼─────────────┘
          │                                 │
          ▼                                 ▼
┌──────────────────┐             ┌──────────────────────┐
│  Upload Pipeline │             │   RAG Query Pipeline  │
│  (Node.js route) │             │   (Node.js route)     │
└────────┬─────────┘             └──────────┬───────────┘
         │                                  │
    ┌────▼────┐                       ┌─────▼──────┐
    │ Gemini  │ embed chunks          │  Gemini    │ embed question
    │ (doc)   │                       │  (query)   │
    └────┬────┘                       └─────┬──────┘
         │                                  │
    ┌────▼──────────────────────────────────▼──────┐
    │              Supabase (pgvector)              │
    │              documents table                 │
    │  id | content | metadata (jsonb) | embedding │
    └───────────────────────┬──────────────────────┘
                            │ match_documents RPC
                            ▼
                     ┌─────────────┐
                     │  Top-5 most │
                     │  similar    │
                     │  chunks     │
                     └──────┬──────┘
                            │
                     ┌──────▼──────┐
                     │  Groq LLM   │ streams answer + [1][2] citations
                     │  llama-3.3  │
                     └──────┬──────┘
                            │ streaming text
                            ▼
                     Browser chat bubble
                     + citation chips
```

---

## Flow 1 — PDF Ingestion

**Entry point:** `app/api/upload/route.ts`

### Step-by-step

```
Browser (drag & drop)
        │
        │  POST /api/upload
        │  Content-Type: multipart/form-data
        │  field: "file" → File object
        ▼
┌──────────────────────────────────────────────────┐
│  1. VALIDATE                                      │
│     • Must be a File instance                     │
│     • MIME type / extension must be PDF           │
│     • Max 4 MB enforced client-side (validate-   │
│       pdf.ts) and the server rejects bad input    │
└──────────────────────┬───────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────┐
│  2. PARSE                                         │
│     pdf-parse extracts raw text page by page.    │
│     Each page becomes a LangChain Document:       │
│       { pageContent: "...",                       │
│         metadata: { source: "file.pdf",           │
│                     loc: { pageNumber: 3 } } }    │
│     Empty / image-only pages are skipped.         │
└──────────────────────┬───────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────┐
│  3. CHUNK                                         │
│     RecursiveCharacterTextSplitter splits long    │
│     pages into overlapping chunks:                │
│       chunkSize: 500 chars                        │
│       chunkOverlap: 50 chars                      │
│     Overlap preserves sentence context across    │
│     chunk boundaries.                             │
└──────────────────────┬───────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────┐
│  4. SANITIZE                                      │
│     Remove null bytes and lone UTF-16 surrogates  │
│     that would cause PostgreSQL to reject the     │
│     insert.                                       │
└──────────────────────┬───────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────┐
│  5. EMBED                                         │
│     Google Gemini gemini-embedding-001 converts   │
│     each chunk's text into a 768-dimensional      │
│     float vector using RETRIEVAL_DOCUMENT task    │
│     type (optimised for storage-side encoding).   │
│                                                   │
│     Rate-limit handling: up to 3 retries with     │
│     exponential back-off on HTTP 429 responses.   │
└──────────────────────┬───────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────┐
│  6. STORE                                         │
│     Rows are inserted into Supabase `documents`   │
│     in batches of 50 to avoid payload limits:     │
│       content   → raw chunk text                  │
│       metadata  → { source, loc: { pageNumber }}  │
│       embedding → float[768]                      │
└──────────────────────┬───────────────────────────┘
                       │
                       ▼
              JSON response to browser
              { message, pages, chunks, savedChunks }
                       │
                       ▼
              Browser redirects to /chat
```

---

## Flow 2 — RAG Chat Query

**Entry point:** `app/api/ask-agent/route.ts`

### Step-by-step

```
User types question → hits Enter / Send button
        │
        │  POST /api/ask-agent
        │  { messages: [{ role, content }, ...] }
        ▼
┌──────────────────────────────────────────────────┐
│  1. EXTRACT QUERY                                 │
│     Take the last message where role === "user"   │
│     as the search query.                          │
└──────────────────────┬───────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────┐
│  2. EMBED QUERY                                   │
│     Same Gemini model, but task type is           │
│     RETRIEVAL_QUERY (optimised for search-time    │
│     encoding — different from document encoding). │
└──────────────────────┬───────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────┐
│  3. SEMANTIC SEARCH (Supabase RPC)                │
│     match_documents(query_embedding,              │
│                     match_count=5,                │
│                     match_threshold=0.3)          │
│                                                   │
│     Uses cosine similarity (pgvector <=> op).     │
│     Returns the 5 most relevant chunks whose      │
│     similarity score exceeds 0.3.                 │
│                                                   │
│     Each chunk carries:                           │
│       content   → text                            │
│       metadata  → { source, source_id, ... }      │
│       similarity → float 0–1                      │
└──────────────────────┬───────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────┐
│  4. BUILD CITATIONS                               │
│     For each matched chunk, extract:              │
│       id          → 1-based index                 │
│       filename    → metadata.source / filename    │
│       pageNumber  → metadata.loc.pageNumber       │
│       chunkIndex  → metadata.chunk_index          │
│       content     → raw chunk text                │
│                                                   │
│     Build numbered context string:                │
│       "[1] chunk text...\n\n[2] chunk text..."    │
└──────────────────────┬───────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────┐
│  5. LLM INFERENCE (Groq, streaming)               │
│     System prompt tells the model to:             │
│       • Answer using ONLY the provided context    │
│       • Cite sources inline as [1], [2], etc.     │
│       • Respond with "I don't have that           │
│         information." if context is insufficient  │
│                                                   │
│     Model: openai/gpt-oss-120b via Groq API       │
└──────────────────────┬───────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────┐
│  6. STREAM RESPONSE                               │
│     The ReadableStream sends two parts:           │
│                                                   │
│     Part A — citations header (single chunk):     │
│       "CITATIONS_JSON:{...json...}\n\n"           │
│                                                   │
│     Part B — LLM text (streamed token by token):  │
│       "Based on the document [1], the answer..."  │
└──────────────────────┬───────────────────────────┘
                       │
                       ▼
              Browser stream reader
```

---

## Flow 2 — Client-side stream parsing

**Entry point:** `features/chat/use-chat-agent.ts`

```
Stream bytes arrive
        │
        ▼
┌──────────────────────────────────────────────────┐
│  Buffer raw bytes until "\n\n" is found.          │
│                                                   │
│  The text before "\n\n" is the citations header.  │
│  Parse: JSON.parse(header.slice("CITATIONS_JSON:".length))
│  → Citation[]  attached to the assistant message  │
│                                                   │
│  The text after "\n\n" is the start of the LLM    │
│  answer. Continue appending each new chunk to     │
│  message.content, triggering React re-renders.    │
│                                                   │
│  Chat history and the active source are persisted  │
│  in browser storage so refreshes keep the current  │
│  conversation scoped to the same document.        │
└──────────────────────┬───────────────────────────┘
                       │
                       ▼
              message.content streams live
              message.citations set once
```

---

## Flow 2 — Citation UI

**Files:** `features/chat/citation-chip.tsx`, `features/chat/source-panel.tsx`

```
Assistant message rendered
        │
        ├── Bubble with LLM text ([1], [2] inline refs)
        │
        └── Citation chips row (one chip per citation)
                │
                ├── Hover chip
                │     └── Popover: filename + page + 6-line preview
                │
                └── Click chip
                      └── SourcePanel slides in from the right
                            • Full chunk text
                            • Filename + page + chunk index badges
                            • Click backdrop or X to close
```

---

## Data model

### `documents` table

| Column      | Type        | Description                       |
| ----------- | ----------- | --------------------------------- |
| `id`        | bigserial   | Primary key                       |
| `content`   | text        | Raw chunk text (≤ 500 chars)      |
| `metadata`  | jsonb       | `{ source, loc: { pageNumber } }` |
| `embedding` | vector(768) | Gemini embedding                  |

### `Citation` type (frontend)

```typescript
type Citation = {
  id: number; // 1-based position in the retrieved results
  filename: string; // extracted from metadata.source
  pageNumber: number | null;
  chunkIndex: number | null;
  content: string; // full chunk text shown in the source panel
};
```

### `ChatMessage` type (frontend)

```typescript
type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[]; // only present on assistant messages
  timestamp: Date;
};
```

---

## Key design decisions

**Why Groq instead of OpenAI?**
Groq's inference hardware delivers very low latency, which matters for a streaming chat UI where users watch the response appear token by token.

**Why Gemini for embeddings?**
`gemini-embedding-001` produces 768-dimensional vectors with strong semantic quality and a generous free tier. The model supports separate task types for document storage (`RETRIEVAL_DOCUMENT`) vs. query time (`RETRIEVAL_QUERY`), which improves retrieval accuracy.

**Why pgvector in Supabase instead of a dedicated vector DB?**
It removes an infrastructure dependency. The `documents` table lives alongside potential future tables (users, sessions, etc.) in one database, and `match_documents` is a plain SQL function — no external service to operate.

**Why stream the citations header before the LLM text?**
Citations are known before the LLM starts generating (they come from the vector search, not the model). Sending them first means the UI can render the chips immediately, even while the answer is still streaming in.

**Why chunk with 50-char overlap?**
Overlap prevents answers from being cut off at chunk boundaries. A sentence that spans two chunks will have its key phrase duplicated in both, so whichever chunk is retrieved contains a complete thought.
