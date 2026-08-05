"use client";

import * as React from "react";

import {
  clearActiveSource,
  getActiveSourceSnapshot,
  getRecentSourcesSnapshot,
  getServerActiveSourceSnapshot,
  getServerRecentSourcesSnapshot,
  rememberSource,
  saveActiveSource,
  subscribeToSourceChanges,
  type RecentSource,
} from "@/utils/active-source";

export type Citation = {
  id: number;
  filename: string;
  pageNumber: number | null;
  chunkIndex: number | null;
  content: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  timestamp: Date;
};

const MAX_PERSISTED_MESSAGES = 24;

type PersistedChatMessage = Omit<ChatMessage, "timestamp"> & {
  timestamp: string;
};

function getChatStorageKey(sourceId: string | null): string {
  return `docchat.chat.messages:${sourceId ?? "global"}`;
}

function loadPersistedMessages(sourceId: string | null): ChatMessage[] {
  if (typeof window === "undefined") return [];

  const raw = window.localStorage.getItem(getChatStorageKey(sourceId));
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as PersistedChatMessage[];
    if (!Array.isArray(parsed)) return [];

    const messages = parsed
      .filter(
        (message): message is PersistedChatMessage =>
          !!message &&
          (message.role === "user" || message.role === "assistant") &&
          typeof message.id === "string" &&
          typeof message.content === "string" &&
          typeof message.timestamp === "string",
      )
      .map((message) => ({
        ...message,
        timestamp: new Date(message.timestamp),
      }))
      .filter((message) => !Number.isNaN(message.timestamp.getTime()));

    if (messages.at(-1)?.role === "assistant" && !messages.at(-1)?.content.trim()) {
      return messages.slice(0, -1);
    }

    return messages;
  } catch {
    return [];
  }
}

function savePersistedMessages(messages: ChatMessage[], sourceId: string | null) {
  if (typeof window === "undefined") return;

  const visibleMessages =
    messages.at(-1)?.role === "assistant" && !messages.at(-1)?.content.trim()
      ? messages.slice(0, -1)
      : messages;

  const payload: PersistedChatMessage[] = visibleMessages
    .slice(-MAX_PERSISTED_MESSAGES)
    .map((message) => ({
      ...message,
      timestamp: message.timestamp.toISOString(),
    }));

  window.localStorage.setItem(getChatStorageKey(sourceId), JSON.stringify(payload));
}

export function useChatAgent() {
  // Synced straight from localStorage — useSyncExternalStore swaps in the
  // real value on the client with no hydration-mismatch flash and no
  // separate "hydrate on mount" effect.
  const activeSource = React.useSyncExternalStore(
    subscribeToSourceChanges,
    getActiveSourceSnapshot,
    getServerActiveSourceSnapshot,
  );
  const recentSources = React.useSyncExternalStore(
    subscribeToSourceChanges,
    getRecentSourcesSnapshot,
    getServerRecentSourcesSnapshot,
  );
  const activeSourceId = activeSource?.sourceId ?? null;

  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [loadedSourceId, setLoadedSourceId] = React.useState<string | null>(null);
  const [input, setInput] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  // Reload the message history whenever the active source changes. Adjusting
  // state during render (rather than in an effect) avoids an extra render
  // pass — see https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  if (loadedSourceId !== activeSourceId) {
    setLoadedSourceId(activeSourceId);
    setMessages(loadPersistedMessages(activeSourceId));
  }

  React.useEffect(() => {
    if (loadedSourceId !== activeSourceId) return;
    savePersistedMessages(messages, activeSourceId);
  }, [activeSourceId, loadedSourceId, messages]);

  const selectSource = React.useCallback((source: RecentSource | null) => {
    if (!source) {
      clearActiveSource();
      return;
    }

    const nextSource = { ...source, updatedAt: Date.now() };
    rememberSource(nextSource);
    saveActiveSource(nextSource.sourceId, nextSource.label);
  }, []);

  const sendMessage = React.useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || isLoading) return;

      const userMessage: ChatMessage = {
        id: `${Date.now()}-user`,
        role: "user",
        content: trimmed,
        timestamp: new Date(),
      };

      const assistantId = `${Date.now()}-assistant`;
      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };

      const nextMessages = [...messages, userMessage];
      setMessages([...nextMessages, assistantMessage]);
      setInput("");
      setIsLoading(true);

      try {
        const response = await fetch("/api/ask-agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: nextMessages.map(({ role, content: c }) => ({ role, content: c })),
            sourceId: activeSourceId,
          }),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error ?? `HTTP ${response.status}`);
        }

        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let rawBuffer = "";
        let citationsParsed = false;
        let messageContent = "";
        let citations: Citation[] | undefined;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });

          if (!citationsParsed) {
            rawBuffer += chunk;
            const delimIdx = rawBuffer.indexOf("\n\n");
            if (delimIdx >= 0) {
              const header = rawBuffer.substring(0, delimIdx);
              if (header.startsWith("CITATIONS_JSON:")) {
                try {
                  const parsed = JSON.parse(header.slice("CITATIONS_JSON:".length)) as {
                    citations: Citation[];
                  };
                  citations = parsed.citations;
                } catch {
                  // malformed header — treat everything as content
                }
              }
              messageContent = rawBuffer.substring(delimIdx + 2);
              citationsParsed = true;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: messageContent, citations } : m
                )
              );
            }
          } else {
            messageContent += chunk;
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, content: messageContent } : m))
            );
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Something went wrong.";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `Sorry, I ran into an error: ${message}` }
              : m
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [activeSourceId, isLoading, messages]
  );

  return {
    messages,
    input,
    setInput,
    isLoading,
    sendMessage,
    activeSource,
    recentSources,
    selectSource,
  };
}
