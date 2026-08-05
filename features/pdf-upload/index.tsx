"use client";

import type { FC } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MAX_BYTES } from "@/constants/pdf-upload";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/utils/format-bytes";

import { PdfDropzone } from "./pdf-dropzone";
import { PdfUploadFooter } from "./pdf-upload-footer";
import { PdfUploadStatus } from "./pdf-upload-status";
import { usePdfUpload } from "./use-pdf-upload";

interface PdfUploadProps {
  className?: string;
}

export const PdfUpload: FC<PdfUploadProps> = ({ className }) => {
  const {
    state,
    dragActive,
    busy,
    inputRef,
    openFilePicker,
    onInputChange,
    dropHandlers,
  } = usePdfUpload();

  const uploadingFileName =
    state.status === "uploading" ? state.fileName : undefined;

  return (
    <div
      className={cn(
        "group/shell relative isolate w-full max-w-md",
        className
      )}
    >
      {/* Soft outer bloom */}
      <div
        className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] bg-[radial-gradient(ellipse_at_50%_0%,var(--color-primary)_0%,transparent_58%)] opacity-[0.06] blur-2xl transition-opacity duration-700 group-hover/shell:opacity-[0.1] dark:opacity-[0.1] dark:group-hover/shell:opacity-[0.14]"
        aria-hidden
      />
      {/* Edge rim light */}
      <div
        className="pointer-events-none absolute -inset-[1px] rounded-[1.35rem] bg-gradient-to-b from-foreground/[0.06] via-transparent to-primary/[0.08] opacity-80 dark:from-white/[0.08] dark:to-primary/[0.12]"
        aria-hidden
      />

      <Card
        className={cn(
          "relative overflow-hidden rounded-[1.25rem] border-border/40 bg-card/60 shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_24px_48px_-28px_rgba(0,0,0,0.14)] backdrop-blur-xl dark:bg-card/45 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_24px_56px_-24px_rgba(0,0,0,0.45)]",
          "before:pointer-events-none before:absolute before:inset-0 before:bg-[linear-gradient(105deg,transparent_40%,rgba(255,255,255,0.08)_50%,transparent_60%)] before:bg-[length:180%_100%] dark:before:bg-[linear-gradient(105deg,transparent_40%,rgba(255,255,255,0.05)_50%,transparent_60%)]"
        )}
      >
        {/* Tech grid */}
        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] bg-[size:20px_20px] opacity-[0.24] [mask-image:linear-gradient(to_bottom,black_25%,transparent)] dark:opacity-[0.16]"
          aria-hidden
        />

        <CardHeader className="relative space-y-3 border-b border-border/30 bg-gradient-to-b from-muted/25 to-transparent px-5 pb-6 pt-7 sm:px-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center rounded-full border border-border/60 bg-background/60 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              PDF
            </span>
            <span className="text-xs tabular-nums text-muted-foreground">
              Up to {formatBytes(MAX_BYTES)}
            </span>
          </div>
          <div className="space-y-1.5">
            <CardTitle className="bg-gradient-to-br from-foreground via-foreground to-muted-foreground bg-clip-text text-2xl font-semibold tracking-tight text-transparent sm:text-[1.65rem]">
              New document
            </CardTitle>
            <CardDescription className="text-[13px] leading-relaxed text-muted-foreground">
              Add a PDF from your computer.
              Browse to pick a file.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="relative space-y-5 px-5 pt-6 sm:px-7">
          <PdfUploadStatus state={state} />

          <PdfDropzone
            inputRef={inputRef}
            busy={busy}
            dragActive={dragActive}
            uploadingFileName={uploadingFileName}
            onInputChange={onInputChange}
            onDrop={dropHandlers.onDrop}
            onDragOver={dropHandlers.onDragOver}
            onDragEnter={dropHandlers.onDragEnter}
            onDragLeave={dropHandlers.onDragLeave}
          />
        </CardContent>

        <CardFooter className="relative rounded-none border-0 bg-transparent p-0 shadow-none ring-0">
          <PdfUploadFooter busy={busy} onBrowse={openFilePicker} />
        </CardFooter>
      </Card>
    </div>
  );
};
