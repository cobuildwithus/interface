import { describe, expect, it } from "vitest";
import { BaseError } from "viem";
import { formatSignupError, readErrorResponse, sanitizeUsername } from "./utils";

describe("use-farcaster-signup utils", () => {
  it("sanitizes usernames to allowed characters", () => {
    expect(sanitizeUsername("Al!ce__123")).toBe("alce123");
  });

  it("prefers BaseError shortMessage when available", () => {
    const err = new BaseError("boom") as BaseError & { shortMessage?: string };
    err.shortMessage = "short";
    expect(formatSignupError(err)).toBe("short");
  });

  it("falls back to Error.message for generic errors", () => {
    expect(formatSignupError(new Error("nope"))).toBe("nope");
  });

  it("uses a generic message for unknown errors", () => {
    expect(formatSignupError("nope")).toBe("Something went wrong while creating your account.");
  });

  it("reads JSON error payloads", async () => {
    const res = { text: async () => JSON.stringify({ error: "bad" }), status: 400 } as Response;
    await expect(readErrorResponse(res)).resolves.toBe("bad");
  });

  it("falls back to raw text when JSON parsing fails", async () => {
    const res = { text: async () => "not-json", status: 400 } as Response;
    await expect(readErrorResponse(res)).resolves.toBe("not-json");
  });

  it("falls back to status when body is empty", async () => {
    const res = { text: async () => "", status: 500 } as Response;
    await expect(readErrorResponse(res)).resolves.toBe("Request failed (500).");
  });
});
