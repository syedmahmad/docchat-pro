"use client";

/**
 * Renders the outcome of a URL ingestion attempt.
 *
 * Shown after the user submits a URL:
 *   - Nothing while idle (user hasn't submitted yet)
 *   - A red error alert when ingestion failed
 *   - A green success alert + "Start chatting" button when ingestion succeeded
 *
 * The design intentionally mirrors PdfUploadStatus so the two upload flows
 * look and feel identical to the user.
 */

import type { FC } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Globe, MessageSquare } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { UrlUploadState } from "@/types/url-upload";

interface UrlUploadStatusProps {
  // The current state of the URL upload state machine
  state: UrlUploadState;
}

export const UrlUploadStatus: FC<UrlUploadStatusProps> = ({ state }) => {
  // Show a destructive (red) alert when the server returned an error.
  // The message explains what went wrong in plain language.
  if (state.status === "error") {
    return (
      <Alert
        variant="destructive"
        className="rounded-2xl border-destructive/40 bg-destructive/[0.06] backdrop-blur-md"
      >
        {/* AlertCircle icon reinforces the "something went wrong" meaning */}
        <AlertCircle />
        <AlertTitle>Could not process URL</AlertTitle>
        <AlertDescription className="text-[13px] leading-relaxed">
          {/* Display the server-provided error message verbatim */}
          {state.message}
        </AlertDescription>
      </Alert>
    );
  }

  // Show a green success alert with a "Start chatting" button when done.
  // The button navigates to the chat page where the user can query the ingested content.
  if (state.status === "success") {
    return (
      <div className="flex flex-col gap-3">
        <Alert className="rounded-2xl border-emerald-500/25 bg-emerald-500/[0.07] backdrop-blur-md shadow-[0_0_40px_-16px_rgba(16,185,129,0.35)] dark:border-emerald-400/20 dark:bg-emerald-500/[0.09] dark:shadow-[0_0_48px_-12px_rgba(52,211,153,0.25)]">
          {/* Green checkmark icon signals success clearly */}
          <CheckCircle2 className="text-emerald-600 dark:text-emerald-400" />
          <AlertTitle>Ingestion complete</AlertTitle>
          <AlertDescription>
            {/* Globe icon + URL gives the user visual confirmation of which page was ingested */}
            <span className="inline-flex items-center gap-1.5">
              <Globe className="size-3.5 shrink-0 text-muted-foreground" />
              {/* Truncate long URLs with CSS so the layout never breaks */}
              <span className="max-w-[22ch] truncate font-medium text-foreground">
                {state.url}
              </span>
            </span>
            {/* Show chunk / page counts from the server if available */}
            {state.detail ? (
              <>
                <span className="mx-1.5 text-muted-foreground">·</span>
                <span className="text-muted-foreground">{state.detail}</span>
              </>
            ) : null}
          </AlertDescription>
        </Alert>

        {/* Navigate to /chat so the user can immediately ask questions about the ingested page */}
        <Button render={<Link href="/chat" />} className="w-full gap-2 rounded-xl">
          <MessageSquare className="size-4" />
          Start chatting
        </Button>
      </div>
    );
  }

  // Return null while idle — the status area is completely hidden until the user acts
  return null;
};
