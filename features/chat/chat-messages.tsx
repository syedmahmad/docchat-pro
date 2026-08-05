"use client";

import { memo, useEffect, useRef, type FC } from "react";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage, Citation } from "./use-chat-agent";
import { CitationChip } from "./citation-chip";

function renderWithInlineCitations(
  content: string,
  citations: Citation[],
  onOpenPanel: (citation: Citation) => void
) {
  const parts = content.split(/(\[\d+\])/g);
  return parts.map((part, i) => {
    const match = part.match(/^\[(\d+)\]$/);
    if (match) {
      const id = parseInt(match[1], 10);
      const citation = citations.find((c) => c.id === id);
      if (citation) {
          return (
            <button
              key={i}
              type="button"
              onClick={() => onOpenPanel(citation)}
              title={citation.filename}
              aria-label={`Open source ${id}${citation.pageNumber != null ? `, page ${citation.pageNumber}` : ""}`}
              className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary/20 text-primary text-[9px] font-bold mx-0.5 hover:bg-primary/40 transition-colors cursor-pointer align-super leading-none shrink-0"
            >
              {id}
            </button>
        );
      }
    }
    return <span key={i}>{part}</span>;
  });
}

interface ChatMessagesProps {
  messages: ChatMessage[];
  isLoading: boolean;
  activeSourceLabel?: string | null;
  onOpenPanel: (citation: Citation) => void;
  onSuggest?: (text: string) => void;
}

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const TypingDots = () => (
  <span className="flex items-center gap-1 px-1 py-1">
    <span className="size-1.5 rounded-full bg-muted-foreground/60 [animation:typing-bounce_1.2s_ease-in-out_0ms_infinite]" />
    <span className="size-1.5 rounded-full bg-muted-foreground/60 [animation:typing-bounce_1.2s_ease-in-out_200ms_infinite]" />
    <span className="size-1.5 rounded-full bg-muted-foreground/60 [animation:typing-bounce_1.2s_ease-in-out_400ms_infinite]" />
  </span>
);

const ChatMessagesComponent: FC<ChatMessagesProps> = ({
  messages,
  isLoading,
  activeSourceLabel,
  onOpenPanel,
  onSuggest,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  if (messages.length === 0) {
    const suggestions = [
      "Summarize the key points",
      "What are the main conclusions?",
      "List the most important facts",
    ];

    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
        <div className="flex size-14 items-center justify-center rounded-[1.25rem] bg-gradient-to-br from-primary/14 to-primary/6 ring-1 ring-primary/20">
          <FileText className="size-7 text-primary" />
        </div>
        <div className="space-y-1">
          <p className="font-heading font-semibold text-foreground">
            {activeSourceLabel ? "Document ready" : "Pick a document to begin"}
          </p>
          <p className="text-sm text-muted-foreground">
            {activeSourceLabel
              ? `Ask anything about "${activeSourceLabel}"`
              : "Select a document from the library on the left."}
          </p>
        </div>

        {activeSourceLabel && onSuggest && (
          <div className="flex flex-wrap justify-center gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSuggest(s)}
                className="rounded-full border border-border/60 bg-background/80 px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:border-primary/20 hover:bg-primary/6 hover:text-foreground"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4 sm:px-6">
      {messages.map((message, index) => {
        const isUser = message.role === "user";
        const isFirst = index === 0 || messages[index - 1]?.role !== message.role;
        const isLast =
          index === messages.length - 1 || messages[index + 1]?.role !== message.role;

        return (
          <div
            key={message.id}
            className={cn("flex items-end gap-2", isUser ? "flex-row-reverse" : "flex-row")}
          >
            {/* Avatar — only on last bubble of a group, assistant only */}
            {!isUser && (
              <div
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/80 transition-opacity",
                  isLast ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
              >
                <FileText className="size-3.5 text-primary" />
              </div>
            )}

            <div
              className={cn(
                "flex flex-col gap-1",
                isUser ? "items-end" : "items-start",
                "max-w-[78%] sm:max-w-[68%]"
              )}
            >
              {isFirst && (
                <span
                  className={cn(
                    "px-1 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground",
                    isUser && "text-right"
                  )}
                >
                  {isUser ? "You" : "Assistant"}
                </span>
              )}

              <div
                className={cn(
                  "relative px-4 py-3 text-[14px] leading-6 whitespace-pre-wrap break-words shadow-sm",
                  isUser
                    ? "border border-primary/12 bg-primary/8 text-foreground shadow-[0_8px_24px_-18px_rgba(37,99,235,0.25)]"
                    : "border border-border/60 bg-background text-foreground shadow-[0_8px_24px_-18px_rgba(15,23,42,0.18)]",
                  isUser
                    ? cn(
                        "rounded-[18px]",
                        isFirst && isLast && "rounded-[18px]",
                        isFirst && !isLast && "rounded-tr-md",
                        !isFirst && isLast && "rounded-br-[4px]",
                        !isFirst && !isLast && "rounded-r-md"
                      )
                    : cn(
                        "rounded-[18px]",
                        isFirst && isLast && "rounded-[18px]",
                        isFirst && !isLast && "rounded-tl-md",
                        !isFirst && isLast && "rounded-bl-[4px]",
                        !isFirst && !isLast && "rounded-l-md"
                      )
                )}
              >
                {message.content
                  ? !isUser && message.citations && message.citations.length > 0
                    ? renderWithInlineCitations(message.content, message.citations, onOpenPanel)
                    : message.content
                  : <TypingDots />}
              </div>

              {/* Sources section — assistant messages only */}
              {!isUser && message.citations && message.citations.length > 0 && (() => {
                const seen = new Set<string>();
                const uniqueCitations = message.citations.filter((c) => {
                  const key = `${c.filename}:${c.pageNumber ?? ""}`;
                  if (seen.has(key)) return false;
                  seen.add(key);
                  return true;
                });
                return (
                  <div className="space-y-1.5 px-1 pt-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60">
                      Sources
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {uniqueCitations.map((citation) => (
                        <CitationChip
                          key={citation.id}
                          citation={citation}
                          onOpenPanel={onOpenPanel}
                        />
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Timestamp — only on last bubble of a group */}
              {isLast && (
                <span className="px-1 text-[10px] text-muted-foreground/70">
                  {formatTime(message.timestamp)}
                </span>
              )}
            </div>
          </div>
        );
      })}

      <div ref={bottomRef} />
    </div>
  );
};

export const ChatMessages = memo(ChatMessagesComponent);
