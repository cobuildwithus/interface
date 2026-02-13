import { describe, expect, it } from "vitest";
import { getErrorMessage, getErrorStatus } from "./errors";

describe("neynar error helpers", () => {
  it("extracts message when present", () => {
    expect(getErrorMessage({ message: "boom" }, "fallback")).toBe("boom");
    expect(getErrorMessage({ message: "" }, "fallback")).toBe("fallback");
    expect(getErrorMessage("bad", "fallback")).toBe("bad");
  });

  it("extracts status when present", () => {
    expect(getErrorStatus({ status: 500 })).toBe(500);
    expect(getErrorStatus({ status: "nope" })).toBeUndefined();
    expect(getErrorStatus(null)).toBeUndefined();
  });
});
