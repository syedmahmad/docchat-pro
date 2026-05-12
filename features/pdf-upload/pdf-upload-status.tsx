"use client";

import type { FC } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { PdfUploadState } from "@/types/pdf-upload";

interface PdfUploadStatusProps {
  state: PdfUploadState;
}

export const PdfUploadStatus: FC<PdfUploadStatusProps> = ({ state }) => {
  if (state.status === "error") {
    return (
      <Alert
        variant="destructive"
        className="rounded-2xl border-destructive/40 bg-destructive/[0.06] backdrop-blur-md"
      >
        <AlertCircle />
        <AlertTitle>Could not upload</AlertTitle>
        <AlertDescription className="text-[13px] leading-relaxed">
          {state.message}
        </AlertDescription>
      </Alert>
    );
  }

  if (state.status === "success") {
    return (
      <Alert className="rounded-2xl border-emerald-500/25 bg-emerald-500/[0.07] backdrop-blur-md shadow-[0_0_40px_-16px_rgba(16,185,129,0.35)] dark:border-emerald-400/20 dark:bg-emerald-500/[0.09] dark:shadow-[0_0_48px_-12px_rgba(52,211,153,0.25)]">
        <CheckCircle2 className="text-emerald-600 dark:text-emerald-400" />
        <AlertTitle>Upload complete</AlertTitle>
        <AlertDescription>
          <span className="font-medium text-foreground">{state.fileName}</span>
          {state.detail ? (
            <>
              <span className="mx-1.5 text-muted-foreground">·</span>
              <span className="text-muted-foreground">{state.detail}</span>
            </>
          ) : null}
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};
