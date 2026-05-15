import Link from "next/link";
import { ArrowLeft, FileText, Upload } from "lucide-react";
import { Chat } from "@/features/chat";

export default function ChatPage() {
  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden bg-background">
      {/* Messenger header */}
      <header className="z-10 shrink-0 border-b border-border/50 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center gap-3 px-4 sm:px-6">
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
              {/* Online dot */}
              <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
            </div>
            <div className="flex flex-col">
              <span className="text-[14px] font-semibold leading-tight tracking-tight">
                DocChat AI
              </span>
              <span className="text-[11px] text-emerald-500">Active now</span>
            </div>
          </div>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-1">
            <Link
              href="/"
              className="flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Upload className="size-3" />
              New doc
            </Link>
          </div>
        </div>
      </header>

      {/* Chat fills the remaining height */}
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-hidden">
        <h1 className="sr-only">Chat with your document</h1>
        <Chat className="flex-1" />
      </main>
    </div>
  );
}
