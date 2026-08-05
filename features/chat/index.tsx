"use client";

import { useCallback, useState, type FC, type ChangeEvent, type FormEvent } from "react";
import { cn } from "@/lib/utils";
import { ChatMessages } from "./chat-messages";
import { ChatInput } from "./chat-input";
import { DocumentRail } from "./document-rail";
import { SourcePanel } from "./source-panel";
import { useChatAgent, type Citation } from "./use-chat-agent";

interface ChatProps {
  className?: string;
}

export const Chat: FC<ChatProps> = ({ className }) => {
  const {
    messages,
    input,
    setInput,
    isLoading,
    sendMessage,
    activeSource,
    recentSources,
    selectSource,
  } =
    useChatAgent();
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const clearSource = useCallback(() => selectSource(null), [selectSource]);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void sendMessage(input);
  };

  return (
    <>
      <div
        className={cn(
          "grid h-full min-h-0 gap-4 p-4 sm:p-6 lg:grid-cols-[320px_minmax(0,1fr)]",
          className,
        )}
      >
        <aside className="min-h-0 lg:sticky lg:top-4 lg:h-full">
          <DocumentRail
            activeSource={activeSource}
            recentSources={recentSources}
            onSelectSource={selectSource}
            onClearActive={clearSource}
            className="h-full"
          />
        </aside>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-[1.5rem] border border-border/60 bg-card/95 shadow-[0_24px_80px_-50px_rgba(15,23,42,0.22)]">
          <div className="flex items-center justify-between gap-3 border-b border-border/50 bg-background/75 px-4 py-2.5 sm:px-6">
            <h2 className="font-heading text-sm font-semibold tracking-tight text-foreground">
              Conversation
            </h2>

            {activeSource ? (
              <div className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-[11px] font-medium text-primary">
                <span className="size-1.5 rounded-full bg-primary/60" />
                <span className="max-w-[200px] truncate">{activeSource.label}</span>
              </div>
            ) : (
              <div className="rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-[11px] font-medium text-muted-foreground">
                Select a document to begin
              </div>
            )}
          </div>

          <ChatMessages
            messages={messages}
            isLoading={isLoading}
            activeSourceLabel={activeSource?.label ?? null}
            onOpenPanel={setSelectedCitation}
            onSuggest={setInput}
          />
          <ChatInput
            input={input}
            isLoading={isLoading}
            onChange={handleChange}
            onSubmit={handleSubmit}
          />
        </section>
      </div>
      <SourcePanel citation={selectedCitation} onClose={() => setSelectedCitation(null)} />
    </>
  );
};
