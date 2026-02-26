/** @vitest-environment happy-dom */
import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import type { AttachmentState } from "@/components/ui/chat-input/types";
import { useChatInputSubmitState } from "@/lib/hooks/use-chat-input-submit-state";

const makeAttachment = (overrides: Partial<AttachmentState> = {}): AttachmentState => ({
  id: "att-1",
  url: "https://example.com/image.png",
  mediaType: "image/png",
  filename: "image.png",
  status: "ready",
  isLocal: false,
  progress: 100,
  size: 1024,
  ...overrides,
});

describe("useChatInputSubmitState", () => {
  it("reports canSubmit when text or ready attachments exist", () => {
    const { result, rerender } = renderHook(
      ({ input, attachments }) =>
        useChatInputSubmitState({
          input,
          attachments,
          replyContext: [],
        }),
      {
        initialProps: { input: " Hello ", attachments: [] as AttachmentState[] },
      }
    );

    expect(result.current.trimmedText).toBe("Hello");
    expect(result.current.canSubmit).toBe(true);

    rerender({
      input: " ",
      attachments: [makeAttachment({ status: "ready" })],
    });

    expect(result.current.hasReadyAttachments).toBe(true);
    expect(result.current.canSubmit).toBe(true);
  });

  it("does not allow submit when only reply context exists", () => {
    const { result } = renderHook(() =>
      useChatInputSubmitState({
        input: "",
        attachments: [],
        replyContext: [{ id: "1", messageKey: "m1", text: "Quoted" }],
      })
    );

    expect(result.current.hasReplyContext).toBe(true);
    expect(result.current.canSubmit).toBe(false);
  });
});
