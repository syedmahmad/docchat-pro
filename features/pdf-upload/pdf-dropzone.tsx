"use client";

import * as React from "react";
import type { ChangeEvent, DragEvent, FC, RefObject } from "react";
import { Loader2, Upload } from "lucide-react";

import { ACCEPT } from "@/constants/pdf-upload";
import { cn } from "@/lib/utils";

interface PdfDropzoneProps {
  inputRef: RefObject<HTMLInputElement | null>;
  busy: boolean;
  dragActive: boolean;
  uploadingFileName: string | undefined;
  onInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onDrop: (e: DragEvent) => void;
  onDragOver: (e: DragEvent) => void;
  onDragEnter: (e: DragEvent) => void;
  onDragLeave: (e: DragEvent) => void;
}

/**
 * File input must not live inside `<button>` (invalid HTML and breaks picker /
 * drag-and-drop in browsers). We use a `<label htmlFor>` for the hit target.
 */
export const PdfDropzone: FC<PdfDropzoneProps> = ({
  inputRef,
  busy,
  dragActive,
  uploadingFileName,
  onInputChange,
  onDrop,
  onDragOver,
  onDragEnter,
  onDragLeave,
}) => {
  const inputId = React.useId();

  return (
    <div
      className={cn(
        "rounded-[1.15rem] p-[1px] transition-all duration-300",
        dragActive
          ? "bg-gradient-to-br from-primary/45 via-ring/35 to-primary/25 shadow-[0_0_32px_-8px_var(--color-primary)]"
          : "bg-gradient-to-br from-border/80 via-border/40 to-border/30 group-hover/shell:from-primary/25 group-hover/shell:via-border/50 group-hover/shell:to-ring/20",
      )}
    >
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        onChange={onInputChange}
        disabled={busy}
        aria-busy={busy}
        aria-label="Choose a PDF file or drop it here"
      />

      <label
        htmlFor={inputId}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        className={cn(
          "group/dz relative flex w-full min-h-[200px] cursor-pointer flex-col items-center justify-center gap-4 rounded-[1.1rem] border border-transparent bg-gradient-to-b from-muted/30 via-background/40 to-muted/20 px-6 py-10 text-center outline-none backdrop-blur-md transition-all duration-300 sm:min-h-[228px]",
          "hover:from-muted/40 hover:via-background/55 hover:to-muted/30",
          "focus-within:ring-[3px] focus-within:ring-ring/50",
          dragActive && "from-primary/[0.07] via-background/60 to-primary/[0.05]",
          busy && "pointer-events-none cursor-not-allowed opacity-50",
        )}
      >
        {/* Inner scan corner */}
        <div
          className="pointer-events-none absolute left-3 top-3 size-8 rounded-tl-lg border-l border-t border-foreground/[0.08] opacity-60 transition-opacity group-hover/dz:opacity-100"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-3 right-3 size-8 rounded-br-lg border-b border-r border-foreground/[0.08] opacity-60 transition-opacity group-hover/dz:opacity-100"
          aria-hidden
        />

        <div
          className={cn(
            "pointer-events-none relative flex size-16 items-center justify-center rounded-2xl border border-border/50 bg-gradient-to-br from-background/90 to-muted/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-all duration-300 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
            "group-hover/dz:-translate-y-1 group-hover/dz:shadow-[0_12px_40px_-20px_var(--color-foreground)]",
            dragActive &&
              "scale-105 border-primary/30 shadow-[0_0_24px_-6px_var(--color-primary)]",
          )}
        >
          {busy ? (
            <Loader2 className="size-7 animate-spin text-primary/80" />
          ) : (
            <Upload className="size-7 text-muted-foreground transition-colors group-hover/dz:text-foreground" />
          )}
        </div>
        <div className="pointer-events-none relative space-y-2">
          <p className="text-[15px] font-medium tracking-tight text-foreground">
            {busy ? (
              <>
                <span className="text-muted-foreground">Uploading</span>
                {uploadingFileName ? (
                  <span className="mt-1.5 block max-w-full truncate text-sm font-normal text-muted-foreground sm:mt-0 sm:inline sm:ml-1">
                    <span className="hidden sm:inline">· </span>
                    {uploadingFileName}
                  </span>
                ) : null}
              </>
            ) : (
              <span className="bg-gradient-to-r from-foreground to-foreground/75 bg-clip-text text-transparent">
                Drag your PDF here
              </span>
            )}
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {busy
              ? "Please wait…"
              : "Or click this area to choose a file from your device."}
          </p>
        </div>
      </label>
    </div>
  );
};
