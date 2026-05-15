"use client";

import { type FC, useState } from "react";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Citation } from "./use-chat-agent";

interface CitationChipProps {
  citation: Citation;
  onOpenPanel: (citation: Citation) => void;
}

export const CitationChip: FC<CitationChipProps> = ({ citation, onOpenPanel }) => {
  const [showPopover, setShowPopover] = useState(false);

  const label =
    citation.filename.length > 22
      ? citation.filename.slice(0, 19) + "..."
      : citation.filename;
  const pageLabel = citation.pageNumber != null ? `, p.${citation.pageNumber}` : "";

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setShowPopover(true)}
        onMouseLeave={() => setShowPopover(false)}
        onClick={() => onOpenPanel(citation)}
        className={cn(
          "inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors",
          "hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
        )}
      >
        <FileText className="size-3 shrink-0" />
        <span>[{citation.id}]</span>
        <span>
          {label}
          {pageLabel}
        </span>
      </button>

      {showPopover && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-72 rounded-xl border border-border/60 bg-popover p-3 shadow-xl">
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-primary">
            <FileText className="size-3 shrink-0" />
            <span className="truncate">
              {citation.filename}
              {pageLabel}
            </span>
          </div>
          <p className="line-clamp-6 text-[11px] leading-relaxed text-muted-foreground">
            {citation.content}
          </p>
          <p className="mt-2 text-[10px] text-muted-foreground/50">Click to open full source</p>
        </div>
      )}
    </div>
  );
};
