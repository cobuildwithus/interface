import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import "./result";

describe("result types", () => {
  it("loads without runtime exports", () => {
    expect(true).toBe(true);
  });
});
