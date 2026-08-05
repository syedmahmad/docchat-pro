import { IngestionPanel } from "@/features/ingestion";
import { RecentDocumentsPanel } from "@/features/ingestion/recent-documents-panel";

export default function Home() {
  return (
    <div className="relative flex min-h-full flex-1 flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border/40 bg-background/70 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-4 px-5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/15">
              <span className="text-[11px] font-semibold tracking-[0.24em] text-primary">DC</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-heading text-[15px] font-semibold tracking-tight">DocChat</span>
              <span className="text-[10px] font-medium uppercase tracking-[0.28em] text-muted-foreground">Pro</span>
            </div>
          </div>

          <span className="hidden rounded-full border border-border/50 bg-card/60 px-3 py-1 text-[11px] font-medium text-muted-foreground sm:inline">
            Previous docs stay visible
          </span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-5 py-8 sm:px-6 sm:py-10">
        <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start">
          <div className="w-full lg:sticky lg:top-[5.5rem] lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
            <RecentDocumentsPanel />
          </div>

          <section className="flex w-full flex-1 justify-center">
            <h1 className="sr-only">Add a knowledge source</h1>
            <IngestionPanel />
          </section>
        </div>
      </main>
    </div>
  );
}
