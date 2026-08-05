"use client";

import { type FC, useEffect, useRef } from "react";
import { X, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Citation } from "./use-chat-agent";

interface SourcePanelProps {
  citation: Citation | null;
  onClose: () => void;
}

export const SourcePanel: FC<SourcePanelProps> = ({ citation, onClose }) => {
  const isOpen = citation != null;
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      lastFocusedRef.current?.focus?.();
      return;
    }

    lastFocusedRef.current =
      typeof document !== "undefined" && document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const frame = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.cancelAnimationFrame(frame);
    };
  }, [isOpen, onClose]);

  return (
    <>
      <div
        aria-hidden="true"
        className={cn(
          "fixed inset-0 z-40 bg-slate-950/20 transition-opacity duration-200",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="source-panel-title"
        tabIndex={-1}
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col border-l border-border/60 bg-background shadow-[0_24px_80px_-40px_rgba(15,23,42,0.45)] transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background">
              <FileText className="size-3.5 text-primary" />
            </div>
            <div className="min-w-0">
              <p id="source-panel-title" className="truncate text-sm font-semibold text-foreground">
                {citation?.filename ?? "Source"}
              </p>
              {citation?.pageNumber != null && (
                <p className="text-[11px] text-muted-foreground">Page {citation.pageNumber}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            ref={closeButtonRef}
            onClick={onClose}
            className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          >
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {citation && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                {citation.pageNumber != null && (
                  <span className="rounded-md border border-border/60 bg-muted/40 px-2 py-0.5">
                    Page {citation.pageNumber}
                  </span>
                )}
                {citation.chunkIndex != null && (
                  <span className="rounded-md border border-border/60 bg-muted/40 px-2 py-0.5">
                    Chunk {citation.chunkIndex}
                  </span>
                )}
                <span className="rounded-md border border-primary/10 bg-primary/8 px-2 py-0.5 font-medium text-primary">
                  Source [{citation.id}]
                </span>
              </div>
              <div className="rounded-xl border border-border/60 bg-background p-4">
                <p className="whitespace-pre-wrap text-[14px] leading-6 text-foreground">
                  {citation.content}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
