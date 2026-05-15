"use client";

/**
 * IngestionPanel — a single unified card with two tabs.
 *
 * Tab 1 · Document  → drag-and-drop / file picker for a local PDF
 * Tab 2 · Web URL   → paste a public URL and we fetch + parse it
 *
 * Design decisions:
 * - One card, two panels.  Keeping everything in a single container avoids
 *   the jarring "two cards stacked" layout and gives the page a focal point.
 * - Sliding pill indicator communicates the active tab with motion,
 *   not just colour — it's a common pattern in Linear, Vercel, and Raycast.
 * - Both hooks (usePdfUpload, useUrlUpload) are always mounted so state is
 *   preserved when the user switches tabs and back.
 */

import * as React from "react";
import { FileText, Globe } from "lucide-react";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { MAX_BYTES } from "@/constants/pdf-upload";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/utils/format-bytes";

// PDF upload — inner components imported directly so we can compose them freely
import { PdfDropzone } from "@/features/pdf-upload/pdf-dropzone";
import { PdfUploadFooter } from "@/features/pdf-upload/pdf-upload-footer";
import { PdfUploadStatus } from "@/features/pdf-upload/pdf-upload-status";
import { usePdfUpload } from "@/features/pdf-upload/use-pdf-upload";

// URL upload — same pattern as PDF
import { UrlForm } from "@/features/url-upload/url-form";
import { UrlUploadStatus } from "@/features/url-upload/url-upload-status";
import { useUrlUpload } from "@/features/url-upload/use-url-upload";

// The two tab identifiers — used to keep the switch logic type-safe
type Tab = "document" | "url";

// Static metadata for each tab — drives the pill UI and ARIA attributes
const TABS = [
  { id: "document" as Tab, label: "Document", Icon: FileText },
  { id: "url"      as Tab, label: "Web URL",  Icon: Globe      },
] as const;

export const IngestionPanel = () => {
  // Which tab the user is currently looking at (Document is the default)
  const [activeTab, setActiveTab] = React.useState<Tab>("document");

  // ── PDF upload state ────────────────────────────────────────────────────
  const {
    state: pdfState,        // idle | uploading | success | error
    dragActive,             // true while a file is being dragged over the drop zone
    busy: pdfBusy,          // true while the PDF is being processed server-side
    inputRef,               // ref wired to the hidden <input type="file" />
    openFilePicker,         // programmatically opens the OS file picker
    onInputChange,          // handles file selection from the file picker
    dropHandlers,           // onDrop / onDragOver / onDragEnter / onDragLeave
  } = usePdfUpload();

  // ── URL upload state ────────────────────────────────────────────────────
  const {
    inputValue,             // the text currently in the URL field (controlled)
    setInputValue,          // syncs the input value on every keystroke
    state: urlState,        // idle | submitting | success | error
    busy: urlBusy,          // true while the URL is being fetched + processed
    handleSubmit: handleUrlSubmit, // form onSubmit handler
  } = useUrlUpload();

  // File name to show in the drop zone while a PDF upload is in progress
  const uploadingFileName =
    pdfState.status === "uploading" ? pdfState.fileName : undefined;

  return (
    // Outer shell — the decorative bloom and rim live outside the card border
    <div className="group/shell relative isolate w-full max-w-md">

      {/* Soft radial bloom — a barely-visible primary-colour glow that
          brightens slightly when the user hovers over the card */}
      <div
        className="pointer-events-none absolute -inset-8 -z-10 rounded-[2rem] bg-[radial-gradient(ellipse_at_50%_0%,var(--color-primary)_0%,transparent_55%)] opacity-[0.07] blur-3xl transition-opacity duration-700 group-hover/shell:opacity-[0.12] dark:opacity-[0.11] dark:group-hover/shell:opacity-[0.18]"
        aria-hidden
      />

      {/* Edge rim — a 1 px gradient border that adds depth without a harsh line */}
      <div
        className="pointer-events-none absolute -inset-[1px] rounded-[1.35rem] bg-gradient-to-b from-foreground/[0.06] via-transparent to-primary/[0.08] opacity-80 dark:from-white/[0.08] dark:to-primary/[0.12]"
        aria-hidden
      />

      {/* Main glass card */}
      <Card
        className={cn(
          // Glass-morphism base: semi-transparent background + large backdrop blur
          "relative overflow-hidden rounded-[1.25rem] border-border/40 bg-card/60",
          "shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_32px_64px_-32px_rgba(0,0,0,0.18)]",
          "backdrop-blur-2xl",
          "dark:bg-card/45 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_32px_80px_-28px_rgba(0,0,0,0.65)]",
          // Slow diagonal shine sweep — keeps the card feeling alive without being distracting
          "before:pointer-events-none before:absolute before:inset-0",
          "before:bg-[linear-gradient(105deg,transparent_38%,rgba(255,255,255,0.12)_50%,transparent_62%)]",
          "before:bg-[length:220%_100%] before:animate-[pdf-upload-shine_5s_ease-in-out_infinite]",
          "dark:before:bg-[linear-gradient(105deg,transparent_38%,rgba(255,255,255,0.06)_50%,transparent_62%)]",
        )}
      >
        {/* Decorative grid overlay — fades out towards the bottom */}
        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] bg-[size:20px_20px] opacity-[0.35] [mask-image:linear-gradient(to_bottom,black_25%,transparent)] dark:opacity-[0.22]"
          aria-hidden
        />

        {/* ── Card header: headline + tab switcher ─────────────────────── */}
        <CardHeader className="relative space-y-5 border-b border-border/30 bg-gradient-to-b from-muted/25 to-transparent px-5 pb-5 pt-7 sm:px-7">

          {/* Hero headline — tells the user the purpose of the whole panel */}
          <div className="space-y-1">
            <h2 className="bg-gradient-to-br from-foreground via-foreground to-muted-foreground bg-clip-text text-2xl font-semibold tracking-tight text-transparent sm:text-[1.65rem]">
              Add a knowledge source
            </h2>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Upload a document or paste a URL — then start chatting with it.
            </p>
          </div>

          {/* ── Sliding pill tab switcher ──────────────────────────────── */}
          {/*
            How the sliding indicator works:
            The indicator is position:absolute inside the pill container.
            It always covers exactly half the container width.
            When the active tab changes, a CSS translate slides it right or left.
            The z-index stacking (indicator below buttons) ensures click events
            still reach the buttons.
          */}
          <div
            role="tablist"
            aria-label="Ingestion method"
            className="relative flex rounded-xl border border-border/40 bg-muted/50 p-1 backdrop-blur-sm"
          >
            {/* Sliding active-tab indicator — moves via CSS transform, not left/margin,
                so the animation runs on the compositor thread (no layout thrash) */}
            <div
              className={cn(
                "absolute bottom-1 top-1 left-1 w-[calc(50%-4px)] rounded-[0.6rem]",
                "bg-background shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.06)]",
                "dark:bg-card dark:shadow-[0_2px_8px_rgba(0,0,0,0.35)]",
                "transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
                // Shift the indicator one "tab width + gap" to the right when URL is active
                activeTab === "url" ? "translate-x-[calc(100%+8px)]" : "translate-x-0",
              )}
              aria-hidden
            />

            {/* Render one button per tab from the TABS array */}
            {TABS.map(({ id, label, Icon }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  id={`tab-${id}`}                    // referenced by aria-labelledby on panel
                  aria-selected={isActive}             // tells screen readers which tab is open
                  aria-controls={`panel-${id}`}        // connects the button to its panel
                  onClick={() => setActiveTab(id)}      // switch the active tab
                  className={cn(
                    // Each button fills half the pill container
                    "relative z-10 flex flex-1 items-center justify-center gap-2",
                    "rounded-[0.6rem] px-4 py-2 text-sm font-medium",
                    "transition-colors duration-200 focus-visible:outline-none",
                    "focus-visible:ring-2 focus-visible:ring-ring/60",
                    // Active tab uses high-contrast foreground; inactive is subdued
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground/80",
                  )}
                >
                  <Icon className="size-3.5 shrink-0" aria-hidden />
                  {label}
                </button>
              );
            })}
          </div>
        </CardHeader>

        {/* ── Card content: tab panels ─────────────────────────────────── */}
        <CardContent className="relative px-5 pt-6 sm:px-7">

          {/* ── Panel 1: Document (PDF) ──────────────────────────────────
              Both panels are always mounted (hooks run regardless of active tab).
              The `hidden` attribute hides the inactive panel from view AND
              removes it from the accessibility tree — screen readers won't
              announce content the user can't see.
          */}
          <div
            role="tabpanel"
            id="panel-document"
            aria-labelledby="tab-document"
            hidden={activeTab !== "document"}  // native hidden attr → display:none
          >
            <div className="space-y-5 pb-2">
              {/* Sub-heading describing supported file type and size limit */}
              <p className="text-xs text-muted-foreground">
                PDF files only · up to {formatBytes(MAX_BYTES)}
              </p>

              {/* Error or success alert for the PDF upload */}
              <PdfUploadStatus state={pdfState} />

              {/* Drag-and-drop area with upload icon and loading state */}
              <PdfDropzone
                inputRef={inputRef}
                busy={pdfBusy}
                dragActive={dragActive}
                uploadingFileName={uploadingFileName}
                onInputChange={onInputChange}
                onDrop={dropHandlers.onDrop}
                onDragOver={dropHandlers.onDragOver}
                onDragEnter={dropHandlers.onDragEnter}
                onDragLeave={dropHandlers.onDragLeave}
              />
            </div>
          </div>

          {/* ── Panel 2: Web URL ─────────────────────────────────────────── */}
          <div
            role="tabpanel"
            id="panel-url"
            aria-labelledby="tab-url"
            hidden={activeTab !== "url"}  // same hidden-attribute pattern as above
          >
            <div className="space-y-5 pb-7">
              {/* Sub-heading describing what URL formats are accepted */}
              <p className="text-xs text-muted-foreground">
                Any publicly accessible http or https page
              </p>

              {/* Error or success alert for the URL ingestion */}
              <UrlUploadStatus state={urlState} />

              {/* URL text field + submit button */}
              <UrlForm
                inputValue={inputValue}
                onInputChange={setInputValue}
                onSubmit={handleUrlSubmit}
                busy={urlBusy}
              />
            </div>
          </div>
        </CardContent>

        {/* ── Card footer: "Browse files" button — only relevant for PDF tab ── */}
        {/*
          Conditionally rendered (not just hidden) so it doesn't consume space
          or create a double-border at the bottom of the URL tab.
        */}
        {activeTab === "document" && (
          <CardFooter className="relative rounded-none border-0 bg-transparent p-0 shadow-none ring-0">
            <PdfUploadFooter busy={pdfBusy} onBrowse={openFilePicker} />
          </CardFooter>
        )}
      </Card>
    </div>
  );
};
