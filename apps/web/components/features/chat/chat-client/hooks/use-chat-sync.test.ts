/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useChatSync } from "@/components/features/chat/chat-client/hooks/use-chat-sync";

const buildProps = (overrides: Partial<Parameters<typeof useChatSync>[0]> = {}) => {
  const fetchWithGrant = vi.fn(async () => {
    return {
      ok: true,
      json: async () => ({ messages: [] }),
    } as Response;
  });

  return {
    chatId: "chat-1",
    hasAuth: true,
    hasInitialMessages: false,
    shouldShowConnect: false,
    hasPendingOnMount: false,
    chatMessagesLength: 0,
    hasPendingAssistant: false,
    isLoading: false,
    fetchWithGrant,
    resolveHeaders: vi.fn(() => ({})),
    setChatMessages: vi.fn(),
    ...overrides,
  };
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("useChatSync", () => {
  it("fetches initial messages when no pending message exists", async () => {
    const props = buildProps();
    renderHook(() => useChatSync(props));

    await waitFor(() => {
      expect(props.fetchWithGrant).toHaveBeenCalledTimes(1);
    });
  });

  it("skips the initial fetch when pending exists on mount", async () => {
    const props = buildProps({ hasPendingOnMount: true });
    renderHook(() => useChatSync(props));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(props.fetchWithGrant).not.toHaveBeenCalled();
  });

  it("does not clobber local messages with an empty server response", async () => {
    const props = buildProps({
      chatMessagesLength: 1,
      hasPendingAssistant: true,
      isLoading: false,
    });

    const { unmount } = renderHook(() => useChatSync(props));

    await waitFor(() => {
      expect(props.fetchWithGrant).toHaveBeenCalledTimes(1);
    });

    expect(props.setChatMessages).not.toHaveBeenCalled();
    unmount();
  });
});
