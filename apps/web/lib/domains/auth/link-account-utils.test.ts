import { describe, expect, it } from "vitest";
import { parseLinkErrorMessage } from "./link-account-utils";

describe("parseLinkErrorMessage", () => {
  it("strips the prefix from colon-separated messages", () => {
    expect(parseLinkErrorMessage(new Error("boom"))).toBe("boom");
    expect(parseLinkErrorMessage("Error: second: boom")).toBe("second: boom");
  });

  it("returns the original message when no prefix is present", () => {
    expect(parseLinkErrorMessage("boom")).toBe("boom");
  });

  it("returns empty string for nullish values", () => {
    expect(parseLinkErrorMessage(undefined)).toBe("");
    expect(parseLinkErrorMessage(null)).toBe("");
  });
});
