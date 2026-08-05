import Link from "next/link";
import { ArrowLeft, FileText, Upload } from "lucide-react";
import { Chat } from "@/features/chat";

export default function ChatPage() {
  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-background">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(ellipse_65%_65%_at_50%_0%,color-mix(in_oklab,var(--color-primary)_12%,transparent),transparent_68%)]"
        aria-hidden
      />

      {/* Workspace header */}
      <header className="relative z-10 shrink-0 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
          {/* Back button */}
          <Link
            href="/"
            className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Go back"
          >
            <ArrowLeft className="size-4" />
          </Link>

          {/* Avatar + name */}
          <div className="flex items-center gap-3">
            <div className="relative flex size-10 items-center justify-center rounded-full bg-primary/10 ring-2 ring-primary/20">
              <FileText className="size-5 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="font-heading text-[14px] font-semibold leading-tight tracking-tight">
                DocChat workspace
              </span>
              <span className="text-[11px] text-muted-foreground">
                Choose a document from the library and ask questions below
              </span>
            </div>
          </div>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-1">
            <Link
              href="/"
              className="flex items-center gap-1.5 rounded-full border border-border/50 bg-card/70 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/20 hover:bg-primary/8 hover:text-foreground"
            >
              <Upload className="size-3" />
              New doc
            </Link>
          </div>
        </div>
      </header>

      {/* Chat fills the remaining height */}
      <main className="relative z-10 mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col overflow-hidden">
        <h1 className="sr-only">Chat with your document</h1>
        <Chat className="flex-1" />
      </main>
    </div>
  );
}
