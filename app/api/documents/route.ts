import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_ROWS = 500;
const MAX_SOURCES = 50;

type DocumentSource = {
  sourceId: string;
  label: string;
  kind: "pdf" | "url";
};

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return NextResponse.json(
      { error: "Missing Supabase environment variables." },
      { status: 500 },
    );
  }

  const supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);

  const { data, error } = await supabaseClient
    .from("documents")
    .select("id, metadata")
    .order("id", { ascending: false })
    .limit(MAX_ROWS);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Rows come back most-recent-first (order by id desc), and each upload
  // writes its whole chunk batch together, so the first row we see for a
  // given filename/URL always belongs to its most recent upload. Dedupe on
  // that instead of source_id so re-uploading the same file collapses to a
  // single entry in the list rather than showing every past upload.
  const seenSourceIds = new Set<string>();
  const seenLabels = new Set<string>();
  const sources: DocumentSource[] = [];

  for (const row of data ?? []) {
    if (sources.length >= MAX_SOURCES) break;

    const meta = row.metadata as Record<string, unknown> | null;
    if (!meta) continue;

    const sourceId = typeof meta.source_id === "string" ? meta.source_id.trim() : null;
    const label = typeof meta.source_label === "string" ? meta.source_label.trim() : null;
    const rawKind = typeof meta.source_kind === "string" ? meta.source_kind : "";

    if (!sourceId || !label || seenSourceIds.has(sourceId)) continue;
    seenSourceIds.add(sourceId);

    const kind: "pdf" | "url" = rawKind === "pdf" ? "pdf" : "url";
    const dedupeKey = `${kind}:${label}`;
    if (seenLabels.has(dedupeKey)) continue;
    seenLabels.add(dedupeKey);

    sources.push({ sourceId, label, kind });
  }

  return NextResponse.json({ sources });
}
