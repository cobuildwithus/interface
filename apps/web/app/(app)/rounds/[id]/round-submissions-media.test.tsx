// @vitest-environment happy-dom
/* eslint-disable @next/next/no-img-element */
import "@testing-library/jest-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

import type { RoundSubmission } from "@/types/round-submission";
import { RoundSubmissionsMedia } from "./round-submissions-media";

let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string | { toString(): string };
    children: React.ReactNode;
  }) => (
    <a href={typeof href === "string" ? href : ""} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: { src: string | { toString(): string }; alt?: string }) => (
    <img src={typeof src === "string" ? src : ""} alt={alt ?? ""} {...props} />
  ),
}));

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  searchParams = new URLSearchParams();
});

const baseSubmission: RoundSubmission = {
  source: "farcaster",
  postId: "0x1",
  entityId: "0x1",
  url: null,
  createdAt: null,
  aiTitle: null,
  aiCategory: null,
  authorHandle: null,
  authorDisplayName: null,
  authorAvatarUrl: null,
  rawText: null,
  displayText: null,
  mediaUrls: undefined,
  handle: "user",
  displayName: "User",
  avatarUrl: null,
  summaryText: "Summary",
  beneficiaryAddress: null,
  evalScore: null,
  aiOutput: null,
};

const makeSubmission = (overrides: Partial<RoundSubmission>): RoundSubmission => ({
  ...baseSubmission,
  ...overrides,
});

describe("RoundSubmissionsMedia", () => {
  it("renders a fallback when there are no media submissions", () => {
    render(
      <RoundSubmissionsMedia
        submissions={[makeSubmission({ postId: "0x2", entityId: "0x2" })]}
        intentStatsByEntityId={{}}
        roundId="123"
      />
    );

    expect(screen.getByText("No media submissions yet")).toBeInTheDocument();
  });

  it("renders only media submissions and uses the first non-empty media url", () => {
    const submissions = [
      makeSubmission({
        postId: "0x3",
        entityId: "0x3",
        mediaUrls: ["", "https://example.com/a.png"],
        handle: "alice",
        displayName: "Alice",
        createdAt: null,
      }),
      makeSubmission({
        postId: "0x4",
        entityId: "0x4",
        mediaUrls: ["https://example.com/b.png"],
        handle: "bob",
        displayName: "Bob",
        createdAt: new Date("2025-01-01T00:00:00.000Z").toISOString(),
      }),
      makeSubmission({
        postId: "0x5",
        entityId: "0x5",
        mediaUrls: [],
        handle: "charlie",
        displayName: "Charlie",
      }),
    ];

    const { container } = render(
      <RoundSubmissionsMedia submissions={submissions} intentStatsByEntityId={{}} roundId="123" />
    );

    expect(screen.queryByText("No media submissions yet")).toBeNull();
    expect(container.querySelector("img[src='https://example.com/a.png']")).toBeTruthy();
    expect(container.querySelector("img[src='https://example.com/b.png']")).toBeTruthy();
    expect(screen.getByText("alice")).toBeInTheDocument();
    expect(screen.getByText("bob")).toBeInTheDocument();
    expect(screen.queryByText("charlie")).toBeNull();
  });
});
