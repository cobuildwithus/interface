// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ForumThread } from "./forum-thread";

const replaceMock = vi.fn();
const refreshMock = vi.fn();
const searchParamsMock = vi.hoisted(
  () => new URLSearchParams("post=0x3333333333333333333333333333333333333333")
);

vi.mock("next/navigation", () => ({
  usePathname: () => "/cast/0x1111111111111111111111111111111111111111",
  useRouter: () => ({
    replace: replaceMock,
    refresh: refreshMock,
  }),
  useSearchParams: () => searchParamsMock,
}));

vi.mock("sonner", () => ({
  toast: {
    loading: vi.fn(() => "toast-id"),
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@/components/ui/pagination", () => ({
  PaginationNav: () => <div data-testid="pagination-nav" />,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: ComponentProps<"button">) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("./inline-reply-composer", () => ({
  InlineReplyComposer: () => <div data-testid="inline-reply-composer" />,
}));

vi.mock("./actions/reply", () => ({
  createReplyAction: vi.fn(),
}));

vi.mock("./forum-post", () => ({
  ForumPost: ({
    cast,
    isFocused,
  }: {
    cast: { hash: string; text: string };
    isFocused: boolean;
  }) => (
    <div id={`post-${cast.hash}`} data-testid={`post-${cast.hash}`} data-focused={isFocused}>
      {cast.text}
    </div>
  ),
}));

describe("ForumThread", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    refreshMock.mockReset();
  });

  it("focuses the resolved visible hash when the search param points at a merged-away reply", async () => {
    const scrollIntoViewMock = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoViewMock,
    });

    render(
      <ForumThread
        thread={{
          root: {
            hash: "0x1111111111111111111111111111111111111111",
            parentHash: null,
            text: "Root",
            author: {
              fid: 1,
              username: "alice",
              display_name: "Alice",
              pfp_url: null,
              neynar_score: 0.9,
            },
            createdAt: "2026-03-09T00:00:00.000Z",
            attachment: null,
            viewCount: 0,
          },
          replies: [
            {
              hash: "0x2222222222222222222222222222222222222222",
              parentHash: "0x1111111111111111111111111111111111111111",
              text: "@alice hi",
              author: {
                fid: 2,
                username: "bob",
                display_name: "Bob",
                pfp_url: null,
                neynar_score: 0.9,
              },
              createdAt: "2026-03-09T00:01:00.000Z",
              attachment: null,
              viewCount: 0,
            },
          ],
          replyCount: 1,
          resolvedFocusHash: "0x2222222222222222222222222222222222222222",
          castMap: {},
          page: 1,
          pageSize: 20,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        }}
      />
    );

    await waitFor(() => {
      expect(
        screen
          .getByTestId("post-0x2222222222222222222222222222222222222222")
          .getAttribute("data-focused")
      ).toBe("true");
      expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
    });
  });
});
