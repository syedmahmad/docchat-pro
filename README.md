# DocChat Pro

Chat with any PDF using semantic search and a streaming LLM. Upload a document, ask questions in natural language, and get cited answers that link back to the exact source chunks.

---

## Tech Stack

| Layer            | Technology                           |
| ---------------- | ------------------------------------ |
| Framework        | Next.js 16 (App Router)              |
| Language         | TypeScript                           |
| Styling          | Tailwind CSS v4                      |
| Package manager  | pnpm                                 |
| Vector database  | Supabase (pgvector)                  |
| Embeddings       | Google Gemini `gemini-embedding-001` |
| LLM              | Groq `llama-3.3-70b-versatile`       |
| PDF parsing      | pdf-parse                            |
| AI orchestration | LangChain                            |

---

## Prerequisites

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- A [Supabase](https://supabase.com) project with pgvector enabled
- A [Google AI Studio](https://aistudio.google.com) API key (for Gemini embeddings)
- A [Groq](https://console.groq.com) API key

---

## 1. Clone and install

```bash
git clone <repo-url>
cd docchat-pro
pnpm install
```

---

## 2. Environment variables

Create a `.env.local` file in the project root:

```env
# Supabase — public URL (safe to expose to the browser)
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co

# Supabase — anon/public key (used on client side if needed)
NEXT_PUBLIC_SUPABASE_KEY=<your-supabase-anon-key>

# Supabase — service role key (server-only, never expose to the browser)
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>

# Google Generative AI key (for Gemini embeddings)
GOOGLE_API_KEY=<your-google-api-key>

# Groq API key (for LLM inference)
GROQ_API_KEY=<your-groq-api-key>
```

> **Never commit `.env.local`** — it is already listed in `.gitignore`.

---

## 3. Supabase database setup

Open the **SQL Editor** in your Supabase dashboard and run the following once:

### Enable pgvector

```sql
create extension if not exists vector;
```

### Create the documents table

```sql
create table documents (
  id         bigserial primary key,
  content    text        not null,
  metadata   jsonb       not null default '{}',
  embedding  vector(768) not null
);
```

> The embedding dimension `768` matches `gemini-embedding-001`. Change it if you switch models.

### Create the semantic search function

```sql
create or replace function match_documents(
  query_embedding vector(768),
  match_count     int     default 5,
  match_threshold float   default 0.3
)
returns table (
  id         bigint,
  content    text,
  metadata   jsonb,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where 1 - (documents.embedding <=> query_embedding) > match_threshold
  order by documents.embedding <=> query_embedding
  limit match_count;
end;
$$;
```

### (Optional) Create an index for faster search

```sql
create index on documents
using ivfflat (embedding vector_cosine_ops)
with (lists = 100);
```

---

## 4. Run the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 5. Usage

1. **Upload** — drag and drop a PDF (max 10 MB) on the home page and wait for the success message.
2. **Chat** — you are redirected to `/chat` automatically. Type any question about the document.
3. **Citations** — each answer shows citation chips `[1] filename, p.4`. Hover a chip to preview the source chunk; click to open the full source panel.

---

## Project structure

```
docchat-pro/
├── app/
│   ├── api/
│   │   ├── upload/route.ts       # PDF ingestion pipeline
│   │   └── ask-agent/route.ts    # RAG query + streaming response
│   ├── chat/page.tsx             # Chat UI page
│   ├── page.tsx                  # Upload landing page
│   └── layout.tsx
├── features/
│   ├── pdf-upload/               # Upload form, dropzone, status
│   └── chat/                     # Chat UI, messages, citations, source panel
├── services/
│   └── post-pdf-upload.ts        # HTTP client for /api/upload
├── constants/pdf-upload.ts       # Shared upload config
├── utils/                        # Pure helpers (validation, formatting)
└── types/                        # Shared TypeScript types
```

---

## Scripts

| Command      | Description                      |
| ------------ | -------------------------------- |
| `pnpm dev`   | Start dev server with hot reload |
| `pnpm build` | Production build                 |
| `pnpm start` | Start production server          |
| `pnpm lint`  | Run ESLint                       |

---

## Environment variable reference

| Variable                    | Required | Used in         | Description                              |
| --------------------------- | -------- | --------------- | ---------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`  | Yes      | Client + Server | Supabase project URL                     |
| `NEXT_PUBLIC_SUPABASE_KEY`  | Yes      | Client          | Supabase anon key                        |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes      | Server only     | Supabase service role key — bypasses RLS |
| `GOOGLE_API_KEY`            | Yes      | Server only     | Gemini embedding API key                 |
| `GROQ_API_KEY`              | Yes      | Server only     | Groq LLM API key                         |

---

## See also

- [ARCHITECTURE.md](./ARCHITECTURE.md) — detailed walkthrough of how the two core data flows work end-to-end
