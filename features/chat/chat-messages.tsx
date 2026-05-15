"use client";

import { useEffect, useRef, type FC } from "react";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage, Citation } from "./use-chat-agent";
import { CitationChip } from "./citation-chip";

interface ChatMessagesProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onOpenPanel: (citation: Citation) => void;
}

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const TypingDots = () => (
  <span className="flex items-center gap-1 px-1 py-0.5">
    <span className="size-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:0ms]" />
    <span className="size-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:160ms]" />
    <span className="size-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:320ms]" />
  </span>
);

export const ChatMessages: FC<ChatMessagesProps> = ({ messages, isLoading, onOpenPanel }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
          <FileText className="size-8 text-primary" />
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-foreground">Your document is ready</p>
          <p className="text-sm text-muted-foreground">
            Ask anything — I'll answer from the uploaded PDF.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4 sm:px-6">
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
                  "flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20 transition-opacity",
                  isLast ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
              >
                <FileText className="size-4 text-primary" />
              </div>
            )}

            <div
              className={cn(
                "flex flex-col gap-1",
                isUser ? "items-end" : "items-start",
                "max-w-[75%] sm:max-w-[65%]"
              )}
            >
              <div
                className={cn(
                  "relative px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words shadow-sm",
                  isUser
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-foreground border border-border/60",
                  isUser
                    ? cn(
                        "rounded-[20px]",
                        isFirst && isLast && "rounded-[20px]",
                        isFirst && !isLast && "rounded-tr-md",
                        !isFirst && isLast && "rounded-br-[4px]",
                        !isFirst && !isLast && "rounded-r-md"
                      )
                    : cn(
                        "rounded-[20px]",
                        isFirst && isLast && "rounded-[20px]",
                        isFirst && !isLast && "rounded-tl-md",
                        !isFirst && isLast && "rounded-bl-[4px]",
                        !isFirst && !isLast && "rounded-l-md"
                      )
                )}
              >
                {message.content || <TypingDots />}
              </div>

              {/* Citation chips — assistant messages only */}
              {!isUser && message.citations && message.citations.length > 0 && (
                <div className="flex flex-wrap gap-1.5 px-1 pt-0.5">
                  {message.citations.map((citation) => (
                    <CitationChip
                      key={citation.id}
                      citation={citation}
                      onOpenPanel={onOpenPanel}
                    />
                  ))}
                </div>
              )}

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
