import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { headers } = vi.hoisted(() => ({
  headers: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers }));

import { resolveBaseUrl, resolveRequestOrigin } from "./resolve-base-url";

const ORIGINAL_ENV = { ...process.env };

function setEnv(overrides: Record<string, string | undefined>) {
  process.env = { ...ORIGINAL_ENV, ...overrides };
}

describe("resolveBaseUrl", () => {
  it("uses NEXT_PUBLIC_SITE_URL when set", () => {
    setEnv({ NEXT_PUBLIC_SITE_URL: "https://example.com/" });
    const result = resolveBaseUrl(new Headers());
    expect(result).toBe("https://example.com");
  });

  it("falls back to forwarded host and proto", () => {
    setEnv({ NEXT_PUBLIC_SITE_URL: undefined });
    const headerList = new Headers({
      "x-forwarded-host": "co.build",
      "x-forwarded-proto": "http",
    });
    expect(resolveBaseUrl(headerList)).toBe("http://co.build");
  });

  it("returns default when host missing", () => {
    setEnv({ NEXT_PUBLIC_SITE_URL: undefined });
    const result = resolveBaseUrl(new Headers());
    expect(result).toBe("https://co.build");
  });
});

describe("resolveRequestOrigin", () => {
  it("builds origin from request headers", async () => {
    headers.mockResolvedValueOnce(
      new Headers({ "x-forwarded-host": "co.build", "x-forwarded-proto": "https" })
    );
    await expect(resolveRequestOrigin()).resolves.toBe("https://co.build");
  });

  it("returns default when host missing", async () => {
    headers.mockResolvedValueOnce(new Headers());
    await expect(resolveRequestOrigin()).resolves.toBe("https://co.build");
  });
});
