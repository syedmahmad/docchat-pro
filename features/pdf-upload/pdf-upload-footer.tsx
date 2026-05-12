"use client";

import type { FC } from "react";
import { FileText } from "lucide-react";

import { Button } from "@/components/ui/button";

interface PdfUploadFooterProps {
  busy: boolean;
  onBrowse: () => void;
}

export const PdfUploadFooter: FC<PdfUploadFooterProps> = ({
  busy,
  onBrowse,
}) => (
  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/30 bg-gradient-to-r from-transparent via-muted/20 to-transparent px-5 py-4 sm:px-7">
    <p className="max-w-[16rem] text-xs leading-relaxed text-muted-foreground">
      {busy ? "Sending your file…" : "We do not keep a copy of your file in the browser."}
    </p>
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={busy}
      onClick={onBrowse}
      className="rounded-xl border-border/60 bg-background/40 font-medium backdrop-blur-sm transition-all hover:border-primary/30 hover:bg-background/70"
    >
      <FileText data-icon="inline-start" />
      Browse files
    </Button>
  </div>
);
