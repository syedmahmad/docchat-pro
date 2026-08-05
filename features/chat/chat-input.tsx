"use client";

import type { FC, FormEvent, ChangeEvent, KeyboardEvent } from "react";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  input: string;
  isLoading: boolean;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
}

export const ChatInput: FC<ChatInputProps> = ({ input, isLoading, onChange, onSubmit }) => {
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading) {
        e.currentTarget.form?.requestSubmit();
      }
    }
  };

  const canSend = input.trim().length > 0 && !isLoading;

  return (
    <form
      onSubmit={onSubmit}
      className="border-t border-border/50 bg-background/95 px-4 py-3 sm:px-6"
    >
      <div className="flex items-end gap-3 rounded-[1.1rem] border border-border/60 bg-card px-4 py-3 shadow-[0_4px_16px_-8px_rgba(15,23,42,0.12)] transition-[border-color,box-shadow] focus-within:border-primary/35 focus-within:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.18)]">
        <textarea
          value={input}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask about this document…"
          rows={1}
          disabled={isLoading}
          aria-label="Message"
          className={cn(
            "min-h-[2.25rem] w-full resize-none bg-transparent text-[14px] leading-6 outline-none placeholder:text-muted-foreground/50 disabled:opacity-50",
            "max-h-32 overflow-y-auto"
          )}
          style={{ fieldSizing: "content" } as React.CSSProperties}
        />

        <div className="flex shrink-0 flex-col items-end gap-1">
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Send message"
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-xl border transition-[colors,transform,box-shadow] duration-150",
              canSend
                ? "border-primary/10 bg-primary text-primary-foreground shadow-[0_6px_18px_-10px_rgba(37,99,235,0.5)] hover:-translate-y-0.5 hover:bg-primary/90 active:translate-y-0"
                : "border-border/60 bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            <Send className="size-3.5" />
          </button>
          <p className="text-[10px] text-muted-foreground/50 select-none">⏎ send</p>
        </div>
      </div>
    </form>
  );
};
