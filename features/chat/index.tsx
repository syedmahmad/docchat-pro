"use client";

import { useState, type FC, type ChangeEvent, type FormEvent } from "react";
import { cn } from "@/lib/utils";
import { ChatMessages } from "./chat-messages";
import { ChatInput } from "./chat-input";
import { SourcePanel } from "./source-panel";
import { useChatAgent, type Citation } from "./use-chat-agent";

interface ChatProps {
  className?: string;
}

export const Chat: FC<ChatProps> = ({ className }) => {
  const { messages, input, setInput, isLoading, sendMessage } = useChatAgent();
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void sendMessage(input);
  };

  return (
    <>
      <div className={cn("flex flex-col overflow-hidden", className)}>
        <ChatMessages
          messages={messages}
          isLoading={isLoading}
          onOpenPanel={setSelectedCitation}
        />
        <ChatInput
          input={input}
          isLoading={isLoading}
          onChange={handleChange}
          onSubmit={handleSubmit}
        />
      </div>
      <SourcePanel citation={selectedCitation} onClose={() => setSelectedCitation(null)} />
    </>
  );
};
