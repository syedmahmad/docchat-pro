"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { DocumentRail } from "@/features/chat/document-rail";
import {
  clearActiveSource,
  getActiveSourceSnapshot,
  getServerActiveSourceSnapshot,
  rememberSource,
  saveActiveSource,
  SOURCE_CHANGE_EVENT,
  subscribeToSourceChanges,
  type RecentSource,
} from "@/utils/active-source";

type ApiSource = {
  sourceId: string;
  label: string;
  kind: "pdf" | "url";
};

type ApiResponse = {
  sources: ApiSource[];
};

export function RecentDocumentsPanel() {
  const router = useRouter();
  const activeSource = React.useSyncExternalStore(
    subscribeToSourceChanges,
    getActiveSourceSnapshot,
    getServerActiveSourceSnapshot,
  );
  const [sources, setSources] = React.useState<RecentSource[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Fetch on mount and re-fetch whenever a new upload completes elsewhere in
  // the app, so the new doc appears immediately. The fetch closure is kept
  // local to this effect (rather than a shared useCallback) and setState
  // only happens after `await`, in the promise continuation.
  React.useEffect(() => {
    let ignore = false;

    const fetchSources = async () => {
      try {
        const res = await fetch("/api/documents");
        if (!res.ok) return;
        const json = (await res.json()) as ApiResponse;
        if (ignore) return;
        setSources(json.sources.map((s) => ({ ...s, updatedAt: 0 })));
      } catch {
        // silently ignore network errors
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    void fetchSources();

    const onSourceChange = () => void fetchSources();
    window.addEventListener(SOURCE_CHANGE_EVENT, onSourceChange);

    return () => {
      ignore = true;
      window.removeEventListener(SOURCE_CHANGE_EVENT, onSourceChange);
    };
  }, []);

  const selectSource = React.useCallback(
    (source: RecentSource | null) => {
      if (!source) {
        clearActiveSource();
        return;
      }
      const nextSource = { ...source, updatedAt: Date.now() };
      rememberSource(nextSource);
      saveActiveSource(nextSource.sourceId, nextSource.label);
      router.push("/chat");
    },
    [router],
  );

  return (
    <DocumentRail
      activeSource={activeSource}
      recentSources={sources}
      onSelectSource={selectSource}
      onClearActive={() => selectSource(null)}
      title="Your documents"
      description="All uploaded documents — select one to start chatting."
      emptyMessage="No documents in the database yet. Upload a PDF or paste a URL to get started."
      showUploadCta={false}
      loading={loading}
      className="min-h-[520px]"
    />
  );
}
