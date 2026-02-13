import { describe, it, expect } from "vitest";
import { parseTweetInput, extractUsernameFromTweetUrl } from "./parse-tweet-url";

describe("parseTweetInput", () => {
  it("parses raw tweet id (no username)", () => {
    expect(parseTweetInput("1999394881027080400")).toEqual({
      tweetId: "1999394881027080400",
      url: null,
      username: null,
    });
  });

  it("parses x.com status URL with username", () => {
    const url = "https://x.com/rocketman_w/status/1999394881027080400";
    expect(parseTweetInput(url)).toEqual({
      tweetId: "1999394881027080400",
      url,
      username: "rocketman_w",
    });
  });

  it("parses x.com status URL with username (faircaster example)", () => {
    const url = "https://x.com/faircaster/status/1996708979628491080";
    expect(parseTweetInput(url)).toEqual({
      tweetId: "1996708979628491080",
      url,
      username: "faircaster",
    });
  });

  it("parses twitter.com status URL with username", () => {
    const url = "https://twitter.com/rocketman_w/status/1999394881027080400";
    const result = parseTweetInput(url);
    expect(result?.tweetId).toBe("1999394881027080400");
    expect(result?.username).toBe("rocketman_w");
  });

  it("parses mobile.twitter.com status URL with username", () => {
    const url = "https://mobile.twitter.com/elonmusk/status/1999394881027080400";
    const result = parseTweetInput(url);
    expect(result?.tweetId).toBe("1999394881027080400");
    expect(result?.username).toBe("elonmusk");
  });

  it("trims whitespace", () => {
    const url = "https://x.com/rocketman_w/status/1999394881027080400";
    expect(parseTweetInput(`  ${url}  `)?.tweetId).toBe("1999394881027080400");
    expect(parseTweetInput(`  ${url}  `)?.username).toBe("rocketman_w");
  });

  it("ignores query params by capturing base URL", () => {
    const baseUrl = "https://x.com/rocketman_w/status/1999394881027080400";
    const url = `${baseUrl}?s=46`;
    expect(parseTweetInput(url)).toEqual({
      tweetId: "1999394881027080400",
      url: baseUrl,
      username: "rocketman_w",
    });
  });

  it("returns null for invalid input", () => {
    expect(parseTweetInput("")).toBeNull();
    expect(parseTweetInput("not-a-url")).toBeNull();
    expect(parseTweetInput("https://x.com/rocketman_w")).toBeNull();
  });
});

describe("extractUsernameFromTweetUrl", () => {
  it("extracts username from x.com URL", () => {
    expect(extractUsernameFromTweetUrl("https://x.com/faircaster/status/1996708979628491080")).toBe(
      "faircaster"
    );
  });

  it("extracts username from twitter.com URL", () => {
    expect(
      extractUsernameFromTweetUrl("https://twitter.com/rocketman_w/status/1999394881027080400")
    ).toBe("rocketman_w");
  });

  it("returns null for raw tweet ID", () => {
    expect(extractUsernameFromTweetUrl("1999394881027080400")).toBeNull();
  });

  it("returns null for invalid input", () => {
    expect(extractUsernameFromTweetUrl("not-a-url")).toBeNull();
    expect(extractUsernameFromTweetUrl("")).toBeNull();
  });
});
