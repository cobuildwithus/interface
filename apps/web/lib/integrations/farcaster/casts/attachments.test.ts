import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  getPrimaryAttachment,
  getTitleAndExcerpt,
} from "@/lib/integrations/farcaster/casts/attachments";

describe("getPrimaryAttachment", () => {
  it("returns null when embeds and summaries do not contain usable URLs", () => {
    expect(getPrimaryAttachment(undefined, undefined)).toBeNull();
    expect(getPrimaryAttachment([{ url: "" }], ["", "   "])).toBeNull();
  });

  it("prefers image URLs over links even when links appear first", () => {
    const attachment = getPrimaryAttachment(
      [{ url: "https://www.example.com/post" }, { url: "https://i.imgur.com/cat-photo" }],
      null
    );

    expect(attachment).toEqual({
      kind: "image",
      url: "https://i.imgur.com/cat-photo",
      label: null,
      sourceUrl: "https://i.imgur.com/cat-photo",
    });
  });

  it("extracts nested image URLs from JSON embed summaries", () => {
    const summary = JSON.stringify({
      metadata: {
        openGraph: {
          image: {
            url: "https://cdn.discordapp.com/attachments/image.webp",
          },
        },
      },
    });

    const attachment = getPrimaryAttachment(undefined, [summary]);

    expect(attachment).toEqual({
      kind: "image",
      url: "https://cdn.discordapp.com/attachments/image.webp",
      label: null,
      sourceUrl: "https://cdn.discordapp.com/attachments/image.webp",
    });
  });

  it("extracts URLs when image fields are arrays of nested candidates", () => {
    const summary = JSON.stringify({
      metadata: {
        image: [{ bad: "x" }, { url: "https://images.neynar.com/image/123" }],
      },
    });

    const attachment = getPrimaryAttachment(undefined, [summary]);

    expect(attachment).toEqual({
      kind: "image",
      url: "https://images.neynar.com/image/123",
      label: null,
      sourceUrl: "https://images.neynar.com/image/123",
    });
  });

  it("falls back to first link and normalizes host labels", () => {
    const attachment = getPrimaryAttachment(
      [{ url: "https://www.example.com/articles/123" }],
      null
    );

    expect(attachment).toEqual({
      kind: "link",
      url: "https://www.example.com/articles/123",
      label: "example.com",
      sourceUrl: "https://www.example.com/articles/123",
    });
  });

  it("ignores non-http summary urls and keeps searching for valid candidates", () => {
    const attachment = getPrimaryAttachment(undefined, [
      JSON.stringify({ url: "ipfs://image-hash" }),
      JSON.stringify({
        html: { images: [{ url: "https://res.cloudinary.com/demo/image/upload/x.jpg" }] },
      }),
    ]);

    expect(attachment).toEqual({
      kind: "image",
      url: "https://res.cloudinary.com/demo/image/upload/x.jpg",
      label: null,
      sourceUrl: "https://res.cloudinary.com/demo/image/upload/x.jpg",
    });
  });

  it("ignores malformed JSON and array summaries without URL candidates", () => {
    const attachment = getPrimaryAttachment(undefined, [
      "{malformed json",
      JSON.stringify([{ no: "url" }, { still: "none" }]),
    ]);

    expect(attachment).toBeNull();
  });
});

describe("getTitleAndExcerpt", () => {
  it("uses the first line as title and combines remaining lines as excerpt", () => {
    const result = getTitleAndExcerpt("Launch update\nWe shipped X\nAnd fixed Y");

    expect(result).toEqual({
      title: "Launch update",
      excerpt: "We shipped X And fixed Y",
    });
  });

  it("falls back to Untitled cast when first line is blank", () => {
    const result = getTitleAndExcerpt("   \n  details still present");

    expect(result).toEqual({
      title: "Untitled cast",
      excerpt: "details still present",
    });
  });
});
