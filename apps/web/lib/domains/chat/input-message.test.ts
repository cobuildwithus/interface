import { describe, expect, it } from "vitest";
import type { FileUIPart } from "ai";
import {
  hasChatInputContent,
  normalizeChatInputMessage,
  parseChatInputMessage,
  serializeChatInputMessage,
} from "./input-message";

const sampleFile: FileUIPart = {
  type: "file",
  url: "https://example.com/a.png",
  mediaType: "image/png",
};

describe("normalizeChatInputMessage", () => {
  it("trims text and fills missing files", () => {
    const normalized = normalizeChatInputMessage({
      text: "  hello ",
      files: undefined,
    });

    expect(normalized).toEqual({ text: "hello", files: [] });
  });
});

describe("hasChatInputContent", () => {
  it("returns true when text has content", () => {
    expect(hasChatInputContent({ text: "hello", files: [] })).toBe(true);
  });

  it("returns true when files exist", () => {
    expect(hasChatInputContent({ text: " ", files: [sampleFile] })).toBe(true);
  });

  it("returns false for empty text and files", () => {
    expect(hasChatInputContent({ text: "   ", files: [] })).toBe(false);
  });
});

describe("serializeChatInputMessage / parseChatInputMessage", () => {
  it("round-trips serialized messages", () => {
    const message = { text: "hello", files: [sampleFile] };
    const serialized = serializeChatInputMessage(message);

    expect(JSON.parse(serialized)).toEqual({ text: "hello", files: [sampleFile] });
    expect(parseChatInputMessage(serialized)).toEqual(message);
  });

  it("returns null for empty input", () => {
    expect(parseChatInputMessage("")).toBeNull();
    expect(parseChatInputMessage("   ")).toBeNull();
    expect(parseChatInputMessage(null)).toBeNull();
  });

  it("falls back to plain text for invalid JSON", () => {
    expect(parseChatInputMessage("{")).toEqual({ text: "{", files: [] });
  });

  it("treats JSON string payloads as plain text", () => {
    const value = JSON.stringify("hello");
    expect(parseChatInputMessage(value)).toEqual({ text: value, files: [] });
  });

  it("falls back when JSON objects contain no usable content", () => {
    const value = JSON.stringify({ text: "  ", files: "nope" });
    expect(parseChatInputMessage(value)).toEqual({ text: value, files: [] });
  });
});
