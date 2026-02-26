"use client";

import type { ToolUIPart, UIMessage } from "ai";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { getMessageToolParts, type ToolPart } from "@/lib/domains/chat/messages";
import { cn } from "@/lib/shared/utils";

type ChatToolPartsProps = {
  message: UIMessage;
  toolParts?: ToolPart[];
  className?: string;
};

const isWebSearchTool = (part: ToolPart) =>
  part.type === "tool-web_search" || part.type === "tool-web_search_preview";

export function ChatToolParts({ message, toolParts, className }: ChatToolPartsProps) {
  const resolvedToolParts = toolParts ?? getMessageToolParts(message);
  if (resolvedToolParts.length === 0) return null;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {resolvedToolParts.map((part, index) => {
        const toolKey = part.toolCallId ?? `${part.type}-${index}`;
        const isWebSearch = isWebSearchTool(part);
        const state = part.state ?? "";
        const showInput =
          [
            "input-streaming",
            "input-available",
            "approval-requested",
            "approval-responded",
          ].includes(state) || part.input != null;
        const showToolOutput =
          (["output-available", "output-error", "output-denied"].includes(state) ||
            part.output != null ||
            !!part.errorText) &&
          (!isWebSearch || !!part.errorText);
        const resolvedState = (state || "input-streaming") as ToolUIPart["state"];
        const title =
          part.type === "dynamic-tool" && "toolName" in part ? part.toolName : undefined;
        const resolvedType = (
          part.type === "dynamic-tool" ? `tool-${part.toolName ?? "tool"}` : part.type
        ) as ToolUIPart["type"];

        return (
          <Tool key={toolKey}>
            <ToolHeader state={resolvedState} type={resolvedType} title={title} />
            <ToolContent>
              {showInput && <ToolInput input={part.input} />}
              {showToolOutput && <ToolOutput errorText={part.errorText} output={part.output} />}
            </ToolContent>
          </Tool>
        );
      })}
    </div>
  );
}
