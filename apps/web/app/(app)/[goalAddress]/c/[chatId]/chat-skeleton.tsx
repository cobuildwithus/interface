"use client";

import { ChatInput } from "@/components/ui/chat-input";

const noop = () => false;

export function GoalChatSkeleton() {
  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="min-h-0 flex-1" />
      <div className="pointer-events-none sticky bottom-6 z-10 shrink-0 opacity-50">
        <div className="mx-auto w-full max-w-[768px]">
          <ChatInput
            onSubmit={noop}
            isLoading
            className="font-content"
            inputClassName="text-base leading-relaxed"
            attachmentsEnabled={false}
          />
        </div>
      </div>
    </div>
  );
}
