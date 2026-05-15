"use client";

/**
 * URL Ingestion card — the top-level component for the URL upload flow.
 *
 * Combines:
 *   - useUrlUpload hook (state + submit logic)
 *   - UrlUploadStatus component (error / success banners)
 *   - UrlForm component (URL text field + submit button)
 *
 * The visual design (glass card, gradient bloom, edge rim light, tech grid)
 * intentionally mirrors PdfUpload so both cards look like siblings on the home page.
 */

import type { FC } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { UrlForm } from "./url-form";
import { UrlUploadStatus } from "./url-upload-status";
import { useUrlUpload } from "./use-url-upload";

interface UrlUploadProps {
  // Optional extra Tailwind classes from the parent page
  className?: string;
}

export const UrlUpload: FC<UrlUploadProps> = ({ className }) => {
  // Destructure everything the card needs from the state management hook
  const { inputValue, setInputValue, state, busy, handleSubmit } =
    useUrlUpload();

  return (
    <div
      className={cn(
        // Position the decorative pseudo-elements relative to this container
        "group/shell relative isolate w-full max-w-md",
        className,
      )}
    >
      {/* Soft radial bloom behind the card — subtle brand colour glow on hover */}
      <div
        className="pointer-events-none absolute -inset-8 -z-10 rounded-[2rem] bg-[radial-gradient(ellipse_at_50%_0%,var(--color-primary)_0%,transparent_55%)] opacity-[0.07] blur-3xl transition-opacity duration-700 group-hover/shell:opacity-[0.12] dark:opacity-[0.11] dark:group-hover/shell:opacity-[0.18]"
        aria-hidden
      />

      {/* Thin gradient rim that outlines the card edge — adds depth without a harsh border */}
      <div
        className="pointer-events-none absolute -inset-[1px] rounded-[1.35rem] bg-gradient-to-b from-foreground/[0.06] via-transparent to-primary/[0.08] opacity-80 dark:from-white/[0.08] dark:to-primary/[0.12]"
        aria-hidden
      />

      <Card
        className={cn(
          // Glass-morphism card: semi-transparent background + large backdrop blur
          "relative overflow-hidden rounded-[1.25rem] border-border/40 bg-card/60 shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_32px_64px_-32px_rgba(0,0,0,0.18)] backdrop-blur-2xl dark:bg-card/45 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_32px_80px_-28px_rgba(0,0,0,0.65)]",
          // Animated diagonal shine sweep — uses the same keyframe as the PDF card
          "before:pointer-events-none before:absolute before:inset-0 before:bg-[linear-gradient(105deg,transparent_38%,rgba(255,255,255,0.12)_50%,transparent_62%)] before:bg-[length:220%_100%] before:animate-[pdf-upload-shine_5s_ease-in-out_infinite] dark:before:bg-[linear-gradient(105deg,transparent_38%,rgba(255,255,255,0.06)_50%,transparent_62%)]",
        )}
      >
        {/* Decorative grid overlay — matches the PDF card for visual consistency */}
        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] bg-[size:20px_20px] opacity-[0.35] [mask-image:linear-gradient(to_bottom,black_25%,transparent)] dark:opacity-[0.22]"
          aria-hidden
        />

        {/* Card header — badge + title + description */}
        <CardHeader className="relative space-y-3 border-b border-border/30 bg-gradient-to-b from-muted/25 to-transparent px-5 pb-6 pt-7 sm:px-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* "URL" badge mirrors the "PDF" badge on the PDF card */}
            <span className="inline-flex items-center rounded-full border border-border/60 bg-background/50 px-2.5 py-0.5 text-xs font-medium text-muted-foreground backdrop-blur-sm">
              URL
            </span>
            {/* Tells the user which protocol schemes are accepted */}
            <span className="text-xs tabular-nums text-muted-foreground">
              http · https
            </span>
          </div>

          <div className="space-y-1.5">
            {/* Gradient text title — same typographic treatment as the PDF card */}
            <CardTitle className="bg-gradient-to-br from-foreground via-foreground to-muted-foreground bg-clip-text text-2xl font-semibold tracking-tight text-transparent sm:text-[1.65rem]">
              From a web page
            </CardTitle>
            <CardDescription className="text-[13px] leading-relaxed text-muted-foreground">
              {/* One-sentence description so the purpose is immediately clear */}
              Paste a public URL and we will extract its content for the AI to read.
            </CardDescription>
          </div>
        </CardHeader>

        {/* Card body — status banners (if any) + URL input form */}
        <CardContent className="relative space-y-5 px-5 pt-6 pb-7 sm:px-7">
          {/* Renders nothing while idle; shows error or success banners after submission */}
          <UrlUploadStatus state={state} />

          {/* The actual URL input + submit button */}
          <UrlForm
            inputValue={inputValue}
            onInputChange={setInputValue}
            onSubmit={handleSubmit}
            busy={busy}
          />
        </CardContent>
      </Card>
    </div>
  );
};
