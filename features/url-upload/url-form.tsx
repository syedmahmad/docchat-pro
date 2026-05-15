"use client";

/**
 * URL input form for the URL ingestion card.
 *
 * Renders:
 *   - A text input where the user pastes a web address
 *   - A submit button that shows a spinner while loading
 *
 * Why a separate component?
 * Keeps the visual form logic isolated from state management (useUrlUpload)
 * and the card shell (index.tsx), making each piece easy to test and tweak.
 */

import type { FC } from "react";
import { Loader2, Globe, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UrlFormProps {
  // The controlled value of the URL input
  inputValue: string;
  // Called on every keystroke to update the controlled value in the parent hook
  onInputChange: (value: string) => void;
  // Called when the form is submitted (Enter key or button click)
  onSubmit: (e: React.FormEvent) => void;
  // True while the server is processing — disables input + button and shows spinner
  busy: boolean;
}

export const UrlForm: FC<UrlFormProps> = ({
  inputValue,
  onInputChange,
  onSubmit,
  busy,
}) => {
  return (
    // Use an HTML <form> so pressing Enter in the input also triggers submission
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      {/* Input row: globe icon + URL text field */}
      <div
        className={cn(
          // Pill-shaped container with a subtle border that glows on focus
          "flex items-center gap-2 rounded-2xl border border-border/50 bg-background/60 px-4 py-3",
          "ring-offset-background transition-all duration-150",
          "focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/20",
          // While loading, dim the container to signal that interaction is paused
          busy && "opacity-60",
        )}
      >
        {/* Globe icon gives users a visual cue that this field expects a URL */}
        <Globe className="size-4 shrink-0 text-muted-foreground" />

        <input
          type="url" // "url" type adds mobile keyboard with .com shortcut on iOS
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)} // update controlled value on every keystroke
          placeholder="https://example.com/article"
          disabled={busy} // prevent typing while the server is processing
          autoComplete="off" // avoid browser autofill interfering with pasted URLs
          spellCheck={false} // URLs are not natural language; spell-check is just noise
          className={cn(
            // Fill the remaining horizontal space; invisible border/background
            "min-w-0 flex-1 bg-transparent text-[14px] outline-none",
            "placeholder:text-muted-foreground/50",
          )}
        />
      </div>

      {/* Submit button — full width so it's easy to tap on mobile */}
      <Button
        type="submit"
        disabled={busy || !inputValue.trim()} // disabled when empty or loading
        className="w-full gap-2 rounded-xl"
      >
        {busy ? (
          // Spinner replaces the button text while the server is working
          <>
            <Loader2 className="size-4 animate-spin" />
            Processing…
          </>
        ) : (
          // Normal state — arrow icon reinforces "go fetch that page"
          <>
            <ArrowRight className="size-4" />
            Ingest URL
          </>
        )}
      </Button>
    </form>
  );
};
