import type { Metadata } from "next";
import type { cache as reactCache } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const normalizeCastHashMock = vi.hoisted(() => vi.fn());
const getTitleAndExcerptMock = vi.hoisted(() => vi.fn());
const getCobuildFlatCastThreadMock = vi.hoisted(() => vi.fn());
const resolveBaseUrlMock = vi.hoisted(() => vi.fn());
const headersMock = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
const passthroughCache = vi.hoisted(
  () => ((fn: Parameters<typeof reactCache>[0]) => fn) as typeof reactCache
);
vi.mock("react", () => ({
  cache: passthroughCache,
}));
vi.mock("next/headers", () => ({
  headers: headersMock,
}));
vi.mock("@/lib/domains/rules/cast-rules/normalize", () => ({
  normalizeCastHash: (...args: Parameters<typeof normalizeCastHashMock>) =>
    normalizeCastHashMock(...args),
}));
vi.mock("@/lib/integrations/farcaster/casts/attachments", () => ({
  getTitleAndExcerpt: (...args: Parameters<typeof getTitleAndExcerptMock>) =>
    getTitleAndExcerptMock(...args),
}));
vi.mock("@/lib/integrations/farcaster/casts", () => ({
  getCobuildFlatCastThread: (...args: Parameters<typeof getCobuildFlatCastThreadMock>) =>
    getCobuildFlatCastThreadMock(...args),
}));
vi.mock("@/lib/server/resolve-base-url", () => ({
  resolveBaseUrl: (...args: Parameters<typeof resolveBaseUrlMock>) => resolveBaseUrlMock(...args),
}));

import { buildCastMetadata, generateCastMetadata } from "@/lib/domains/social/cast-metadata";

const getTwitterCard = (metadata: Metadata): string | undefined => {
  const twitter = metadata.twitter;
  if (!twitter || typeof twitter !== "object" || !("card" in twitter)) return undefined;
  return twitter.card;
};

type OpenGraphImage = string | URL | { url?: string | URL };
const getOpenGraphImages = (metadata: Metadata): OpenGraphImage[] => {
  const images = metadata.openGraph?.images;
  if (!images) return [];
  return Array.isArray(images) ? images : [images];
};

describe("cast metadata", () => {
  beforeEach(() => {
    normalizeCastHashMock.mockReset();
    getTitleAndExcerptMock.mockReset();
    getCobuildFlatCastThreadMock.mockReset();
    resolveBaseUrlMock.mockReset();
    headersMock.mockReset();
  });

  it("returns default metadata when hash is invalid or thread missing", () => {
    normalizeCastHashMock.mockReturnValueOnce(null);

    const metadata = buildCastMetadata({
      baseUrl: "https://co.build",
      hash: "0xabc",
      thread: null,
    });

    expect(metadata.title).toBe("Cast | Cobuild");
    expect(metadata.openGraph?.url).toBe("https://co.build/cast/0xabc");
    expect(getTwitterCard(metadata)).toBe("summary");
  });

  it("builds metadata with image and author", () => {
    normalizeCastHashMock.mockReturnValueOnce("0xabc");
    getTitleAndExcerptMock.mockReturnValueOnce({ title: "A title", excerpt: "Excerpt" });

    const metadata = buildCastMetadata({
      baseUrl: "https://co.build",
      hash: "0xabc",
      thread: {
        root: {
          text: "Hello world",
          author: { username: "alice" },
          attachment: { kind: "image", url: "https://img.test/1.png" },
        },
      } as never,
    });

    const images = getOpenGraphImages(metadata);
    const image = images[0];
    const imageUrl =
      typeof image === "string"
        ? image
        : image instanceof URL
          ? image.toString()
          : image && typeof image === "object" && "url" in image
            ? String((image as { url?: string | URL }).url ?? "")
            : undefined;

    expect(imageUrl).toBe("https://img.test/1.png");
    expect(getTwitterCard(metadata)).toBe("summary_large_image");
    expect(metadata.title).toContain("Cobuild");
  });

  it("generates metadata from thread fetch", async () => {
    normalizeCastHashMock.mockReturnValue("0xdef");
    getTitleAndExcerptMock.mockReturnValue({ title: "Another title", excerpt: "" });
    resolveBaseUrlMock.mockReturnValue("https://co.build");
    headersMock.mockResolvedValue({} as Headers);
    getCobuildFlatCastThreadMock.mockResolvedValue({
      root: {
        text: "Thread body",
        author: {},
        attachment: null,
      },
    });

    const metadata = await generateCastMetadata("0xdef");

    expect(getCobuildFlatCastThreadMock).toHaveBeenCalledWith("0xdef", {
      page: 1,
      focusHash: null,
    });
    expect(getTwitterCard(metadata)).toBe("summary");
  });
});
