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
      className="flex items-end gap-3 border-t border-border/50 bg-background/80 px-4 py-3 backdrop-blur-md sm:px-6"
    >
      <div className="relative flex flex-1 items-end rounded-2xl border border-border/60 bg-muted/40 px-4 py-2 transition-colors focus-within:border-primary/40 focus-within:bg-background">
        <textarea
          value={input}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          placeholder="Message DocChat AI…"
          rows={1}
          disabled={isLoading}
          className={cn(
            "w-full resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-muted-foreground/60 disabled:opacity-50",
            "max-h-32 overflow-y-auto"
          )}
          style={{ fieldSizing: "content" } as React.CSSProperties}
        />
      </div>

      <button
        type="submit"
        disabled={!canSend}
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full transition-all duration-150",
          canSend
            ? "bg-primary text-primary-foreground shadow-md hover:scale-105 hover:shadow-lg active:scale-95"
            : "bg-muted text-muted-foreground cursor-not-allowed"
        )}
      >
        <Send className="size-4 translate-x-px" />
        <span className="sr-only">Send</span>
      </button>
    </form>
  );
};
