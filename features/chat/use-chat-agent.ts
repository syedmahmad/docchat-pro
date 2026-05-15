"use client";

import * as React from "react";

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

export function useChatAgent() {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

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
    [messages, isLoading]
  );

  return { messages, input, setInput, isLoading, sendMessage };
}
