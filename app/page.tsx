/**
 * Home page — renders the unified ingestion panel.
 *
 * The panel itself handles which mode (PDF or URL) the user is in;
 * this page only provides the page chrome (background gradients, header, layout).
 */

// IngestionPanel is a Client Component — it manages its own tab state
import { IngestionPanel } from "@/features/ingestion";

export default function Home() {
  return (
    // Full-height flex column so the header and main area fill the viewport
    <div className="relative flex min-h-full flex-1 flex-col overflow-hidden bg-background">

      {/* Background: large top-centre bloom — sets the ambient tone for the page */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-40%,var(--color-muted),transparent)] opacity-90"
        aria-hidden
      />

      {/* Background: smaller top-right accent — adds visual depth */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_100%_0%,var(--color-muted),transparent)] opacity-50"
        aria-hidden
      />

      {/* ── Site header ────────────────────────────────────────────────── */}
      <header className="relative z-10 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-lg items-center px-5 sm:px-6">

          {/* Wordmark */}
          <div className="flex items-baseline gap-2">
            <span className="text-[15px] font-semibold tracking-tight">DocChat</span>
            {/* "Pro" label in small caps — a common SaaS brand treatment */}
            <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Pro
            </span>
          </div>
        </div>
      </header>

      {/* ── Main content: centred both axes ─────────────────────────────── */}
      <main className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-5 py-12 sm:px-6 sm:py-20">
        {/* Accessible heading announced by screen readers but not visible on screen */}
        <h1 className="sr-only">Add a knowledge source</h1>

        {/* The tabbed ingestion panel — Document tab and Web URL tab */}
        <IngestionPanel />
      </main>
    </div>
  );
}
