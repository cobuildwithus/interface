import { describe, expect, it, vi } from "vitest";
import { RequestValidationError } from "@/lib/server/cli/http";
import { parseEvmAddressInput } from "./validation";

vi.mock("server-only", () => ({}));

describe("parseEvmAddressInput", () => {
  it("normalizes valid addresses to trimmed lowercase form", () => {
    expect(parseEvmAddressInput(" 0xAbC0000000000000000000000000000000000000 ", "owner")).toBe(
      "0xabc0000000000000000000000000000000000000"
    );
  });

  it("throws RequestValidationError with a custom message for invalid addresses", () => {
    expect(() =>
      parseEvmAddressInput("not-an-address", "to", "Invalid recipient address")
    ).toThrowError(new RequestValidationError("Invalid recipient address"));
  });

  it("uses the default message when a custom message is not provided", () => {
    expect(() => parseEvmAddressInput("not-an-address", "owner")).toThrowError(
      new RequestValidationError("owner must be a valid 20-byte hex address (0x + 40 hex chars).")
    );
  });
});
