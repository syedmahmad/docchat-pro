import { PdfUpload } from "@/features/pdf-upload";

export default function Home() {
  return (
    <div className="relative flex min-h-full flex-1 flex-col overflow-hidden bg-background">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-40%,var(--color-muted),transparent)] opacity-90"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_100%_0%,var(--color-muted),transparent)] opacity-50"
        aria-hidden
      />

      <header className="relative z-10 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-lg items-center justify-between px-5 sm:px-6">
          <div className="flex items-baseline gap-2">
            <span className="text-[15px] font-semibold tracking-tight">
              DocChat
            </span>
            <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Pro
            </span>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-5 py-12 sm:px-6 sm:py-20">
        <h1 className="sr-only">Upload a PDF</h1>
        <PdfUpload />
      </main>
    </div>
  );
}
