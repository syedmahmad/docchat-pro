"use client";

import { memo, useMemo } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Clock3,
  FileText,
  Globe,
  LibraryBig,
  RotateCcw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ActiveSource, RecentSource } from "@/utils/active-source";

interface DocumentRailProps {
  activeSource: ActiveSource | null;
  recentSources: RecentSource[];
  onSelectSource: (source: RecentSource | null) => void;
  onClearActive: () => void;
  title?: string;
  description?: string;
  emptyMessage?: string;
  showUploadCta?: boolean;
  loading?: boolean;
  className?: string;
}

function formatTimestamp(updatedAt: number): string | null {
  if (!updatedAt) return null;

  const diffMs = Date.now() - updatedAt;
  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMinutes / 60);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(updatedAt);
}

type GroupAccent = {
  label: string;
  Icon: typeof FileText;
  iconClass: string;
  chipActiveClass: string;
  activeBorderClass: string;
  iconWrapActiveClass: string;
};

const GROUP_ACCENTS: Record<RecentSource["kind"], GroupAccent> = {
  pdf: {
    label: "Documents",
    Icon: FileText,
    iconClass: "text-primary",
    chipActiveClass: "bg-primary/12 text-primary",
    activeBorderClass:
      "border-primary/35 bg-gradient-to-br from-primary/10 to-background shadow-[0_8px_24px_-14px_rgba(59,130,246,0.3)]",
    iconWrapActiveClass: "bg-primary/12",
  },
  url: {
    label: "Websites",
    Icon: Globe,
    iconClass: "text-sky-600 dark:text-sky-400",
    chipActiveClass: "bg-sky-500/12 text-sky-600 dark:text-sky-400",
    activeBorderClass:
      "border-sky-500/35 bg-gradient-to-br from-sky-500/10 to-background shadow-[0_8px_24px_-14px_rgba(14,165,233,0.3)]",
    iconWrapActiveClass: "bg-sky-500/12",
  },
};

function groupSources(sources: RecentSource[]) {
  const documents: RecentSource[] = [];
  const websites: RecentSource[] = [];
  for (const source of sources) {
    (source.kind === "pdf" ? documents : websites).push(source);
  }
  return { documents, websites };
}

function SourceListItem({
  source,
  isActive,
  onSelectSource,
}: {
  source: RecentSource;
  isActive: boolean;
  onSelectSource: (source: RecentSource) => void;
}) {
  const accent = GROUP_ACCENTS[source.kind];
  const Icon = accent.Icon;
  const timestamp = formatTimestamp(source.updatedAt);

  return (
    <button
      type="button"
      onClick={() => onSelectSource(source)}
      className={cn(
        "group w-full rounded-2xl border p-3 text-left transition-[color,background-color,border-color,box-shadow,transform] duration-150",
        isActive
          ? accent.activeBorderClass
          : "border-border/60 bg-background/80 hover:-translate-y-0.5 hover:border-primary/20 hover:bg-primary/6",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-2xl",
            isActive ? accent.iconWrapActiveClass : "bg-muted/70",
          )}
        >
          <Icon
            className={cn("size-4", isActive ? accent.iconClass : "text-muted-foreground")}
          />
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate text-sm font-medium text-foreground">{source.label}</p>
          {timestamp ? (
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Clock3 className="size-3.5" />
              <span>{timestamp}</span>
            </div>
          ) : null}
        </div>
      </div>
    </button>
  );
}

function SourceGroup({
  kind,
  sources,
  activeSource,
  onSelectSource,
}: {
  kind: RecentSource["kind"];
  sources: RecentSource[];
  activeSource: ActiveSource | null;
  onSelectSource: (source: RecentSource) => void;
}) {
  if (sources.length === 0) return null;

  const accent = GROUP_ACCENTS[kind];
  const Icon = accent.Icon;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className={cn("size-3.5", accent.iconClass)} />
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          {accent.label}
        </p>
        <span className="ml-auto rounded-full border border-border/50 bg-background/70 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {sources.length}
        </span>
      </div>

      <div className="space-y-2">
        {sources.map((source) => (
          <SourceListItem
            key={source.sourceId}
            source={source}
            isActive={activeSource?.sourceId === source.sourceId}
            onSelectSource={onSelectSource}
          />
        ))}
      </div>
    </div>
  );
}

function DocumentRailComponent({
  activeSource,
  recentSources,
  onSelectSource,
  onClearActive,
  title = "Document library",
  description = "Pick the document you want the chat to use.",
  emptyMessage = "No documents yet. Upload a PDF or URL and it will appear here.",
  showUploadCta = true,
  loading = false,
  className,
}: DocumentRailProps) {
  const hasRecentSources = recentSources.length > 0;
  const { documents, websites } = useMemo(() => groupSources(recentSources), [recentSources]);

  return (
    <Card
      className={cn(
        "flex h-full flex-col overflow-hidden border-border/60 bg-card/90 shadow-[0_16px_48px_-32px_rgba(15,23,42,0.22)]",
        className,
      )}
    >
      <div className="border-b border-border/50 bg-gradient-to-b from-primary/10 via-background/40 to-transparent px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/12 ring-1 ring-primary/15">
            <LibraryBig className="size-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="font-heading text-sm font-semibold tracking-tight text-foreground">
              {title}
            </h2>
            <p className="text-xs leading-5 text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        <div className="space-y-2 rounded-[1.5rem] border border-primary/10 bg-gradient-to-br from-primary/6 via-background/80 to-background p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Current document
              </p>
              <p className="font-heading text-sm font-semibold text-foreground">
                {activeSource?.label ?? "None selected"}
              </p>
            </div>
            {activeSource ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 rounded-full border border-border/40 bg-background/70 px-3 text-muted-foreground hover:border-primary/20 hover:bg-primary/8 hover:text-foreground"
                onClick={onClearActive}
              >
                <RotateCcw className="size-3.5" />
                Clear
              </Button>
            ) : null}
          </div>

          {activeSource ? (
            <div className="flex items-center gap-2 rounded-2xl border border-primary/12 bg-primary/8 px-3 py-2.5">
              <span className="rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                Active
              </span>
              <span className="min-w-0 truncate text-sm font-medium text-foreground/90">
                {activeSource.label}
              </span>
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-muted-foreground">
              Upload a document or choose one from below. The chat will stay
              scoped to the selected source.
            </p>
          )}
        </div>

        {loading ? (
          <div className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              Loading…
            </p>
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-2xl border border-border/60 bg-background/80 p-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="size-10 shrink-0 rounded-2xl bg-muted/60" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-3 w-3/4 rounded bg-muted/60" />
                      <div className="h-2.5 w-1/3 rounded bg-muted/40" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : hasRecentSources ? (
          <>
            <SourceGroup
              kind="pdf"
              sources={documents}
              activeSource={activeSource}
              onSelectSource={onSelectSource}
            />
            <SourceGroup
              kind="url"
              sources={websites}
              activeSource={activeSource}
              onSelectSource={onSelectSource}
            />
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-border/60 bg-background/70 px-4 py-6 text-sm leading-relaxed text-muted-foreground">
            {emptyMessage}
          </div>
        )}
      </div>

      {showUploadCta ? (
        <div className="border-t border-border/50 bg-gradient-to-t from-primary/6 to-transparent p-4">
          <Button
            render={<Link href="/" />}
            className="w-full gap-2 rounded-xl shadow-sm"
          >
            <ArrowRight className="size-4" />
            Upload a new document
          </Button>
        </div>
      ) : null}
    </Card>
  );
}

export const DocumentRail = memo(DocumentRailComponent);
