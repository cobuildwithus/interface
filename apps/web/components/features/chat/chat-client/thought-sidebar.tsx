"use client";

import type { ToolUIPart, UIMessage } from "ai";
import { type CSSProperties, useMemo } from "react";
import { XIcon } from "lucide-react";
import { MessageResponse } from "@/components/ai-elements/message";
import { Sidebar, SidebarContent, SidebarHeader, SidebarSeparator } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/lib/hooks/use-mobile";
import { formatReasoningDuration } from "@/lib/domains/chat/chat-client-helpers";
import {
  getMessageReasoningDurationMs,
  getMessageThoughtParts,
  getWebSearchSources,
} from "@/lib/domains/chat/messages";
import { ChatToolParts } from "./tool-parts";

type ChatThoughtSidebarProps = {
  message: UIMessage | null;
  onClose: () => void;
};

type ChatThoughtSidebarBodyProps = {
  durationLabel: string;
  message: UIMessage;
  thoughtParts: ReturnType<typeof getMessageThoughtParts>;
  onClose: () => void;
};

const formatHostname = (source: string) => {
  try {
    return new URL(source).hostname.replace(/^www\./i, "");
  } catch {
    return source;
  }
};

const isToolPart = (part: ReturnType<typeof getMessageThoughtParts>[number]): part is ToolUIPart =>
  part.type.startsWith("tool-");

const ChatThoughtSidebarBody = ({
  durationLabel,
  message,
  thoughtParts,
  onClose,
}: ChatThoughtSidebarBodyProps) => {
  const sources = useMemo(() => {
    const urls = thoughtParts.flatMap((part) =>
      isToolPart(part) ? getWebSearchSources(part) : []
    );
    return Array.from(new Set(urls));
  }, [thoughtParts]);

  return (
    <>
      <SidebarHeader className="flex-row items-center justify-between gap-3 px-5 py-3">
        <div className="flex items-center gap-2">
          <p className="text-foreground text-[17px]">Activity</p>
          {durationLabel && (
            <>
              <span className="text-muted-foreground text-base">·</span>
              <p className="text-muted-foreground text-[17px]">{durationLabel}</p>
            </>
          )}
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose}>
          <XIcon className="size-5" />
          <span className="sr-only">Close</span>
        </Button>
      </SidebarHeader>
      <SidebarSeparator className="mx-0 w-full" />
      <SidebarContent className="gap-4 px-6 py-4">
        {thoughtParts.map((part, index) => {
          if (part.type === "reasoning") {
            const text = part.text.trim();
            if (!text) return null;
            return (
              <MessageResponse key={`reasoning-${index}`} className="text-muted-foreground text-sm">
                {text}
              </MessageResponse>
            );
          }

          return (
            <ChatToolParts
              key={part.toolCallId ?? `tool-${index}`}
              message={message}
              toolParts={[part]}
            />
          );
        })}
        {sources.length > 0 && (
          <div className="space-y-2">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Sources · {sources.length}
            </p>
            <div className="flex flex-col gap-2">
              {sources.map((source) => {
                const hostname = formatHostname(source);
                return (
                  <a
                    className="text-foreground hover:border-muted-foreground/40 hover:bg-muted/50 group flex w-full flex-col gap-0.5 rounded-md border px-3 py-2 transition-colors"
                    href={source}
                    key={source}
                    rel="noreferrer"
                    target="_blank"
                    title={source}
                  >
                    <span className="text-xs font-medium group-hover:underline">{hostname}</span>
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </SidebarContent>
    </>
  );
};

export function ChatThoughtSidebar({ message, onClose }: ChatThoughtSidebarProps) {
  const isMobile = useIsMobile();
  if (!message) return null;

  const thoughtParts = getMessageThoughtParts(message);
  if (thoughtParts.length === 0) return null;

  const durationMs = getMessageReasoningDurationMs(message);
  const durationLabel = durationMs !== null ? formatReasoningDuration(durationMs) : "";
  const body = (
    <ChatThoughtSidebarBody
      durationLabel={durationLabel}
      message={message}
      thoughtParts={thoughtParts}
      onClose={onClose}
    />
  );

  if (isMobile) {
    return (
      <Sheet
        open
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <SheetContent
          side="right"
          className="bg-sidebar text-sidebar-foreground p-0 sm:max-w-[380px] [&>button]:hidden"
        >
          {body}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sidebar
      side="right"
      variant="inset"
      collapsible="none"
      className="hidden h-full overflow-hidden md:flex"
      style={{ "--sidebar-width": "380px" } as CSSProperties}
    >
      {body}
    </Sidebar>
  );
}
