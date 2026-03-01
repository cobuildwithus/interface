import { afterEach, describe, expect, it, vi } from "vitest";

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
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("uses NEXT_PUBLIC_SITE_URL when set", () => {
    setEnv({ NEXT_PUBLIC_SITE_URL: "https://example.com/path/" });
    const result = resolveBaseUrl(new Headers());
    expect(result).toBe("https://example.com");
  });

  it("ignores invalid NEXT_PUBLIC_SITE_URL in production", () => {
    setEnv({
      NEXT_PUBLIC_SITE_URL: "javascript:alert(1)",
      NODE_ENV: "production",
    });
    expect(resolveBaseUrl(new Headers({ "x-forwarded-host": "evil.example" }))).toBe(
      "https://co.build"
    );
  });

  it("fails closed to default in production when env missing", () => {
    setEnv({ NEXT_PUBLIC_SITE_URL: undefined, NODE_ENV: "production" });
    const headerList = new Headers({
      "x-forwarded-host": "evil.example",
      "x-forwarded-proto": "http",
    });
    expect(resolveBaseUrl(headerList)).toBe("https://co.build");
  });

  it("falls back to forwarded host and proto in development", () => {
    setEnv({ NEXT_PUBLIC_SITE_URL: undefined, NODE_ENV: "development" });
    const headerList = new Headers({
      "x-forwarded-host": "co.build",
      "x-forwarded-proto": "http",
    });
    expect(resolveBaseUrl(headerList)).toBe("http://co.build");
  });

  it("uses the first forwarded host/proto values when proxies append multiple entries", () => {
    setEnv({ NEXT_PUBLIC_SITE_URL: undefined, NODE_ENV: "development" });
    const headerList = new Headers({
      "x-forwarded-host": "co.build,evil.example",
      "x-forwarded-proto": "https,http",
    });
    expect(resolveBaseUrl(headerList)).toBe("https://co.build");
  });

  it("falls back to host header in development when x-forwarded-host is absent", () => {
    setEnv({ NEXT_PUBLIC_SITE_URL: undefined, NODE_ENV: "development" });
    const headerList = new Headers({
      host: "localhost:3000",
      "x-forwarded-proto": "http",
    });
    expect(resolveBaseUrl(headerList)).toBe("http://localhost:3000");
  });

  it("returns default when forwarded host is malformed in development", () => {
    setEnv({ NEXT_PUBLIC_SITE_URL: undefined, NODE_ENV: "development" });
    const result = resolveBaseUrl(new Headers({ "x-forwarded-host": "%%%bad-host%%%" }));
    expect(result).toBe("https://co.build");
  });

  it("returns default when host missing", () => {
    setEnv({ NEXT_PUBLIC_SITE_URL: undefined, NODE_ENV: "development" });
    const result = resolveBaseUrl(new Headers());
    expect(result).toBe("https://co.build");
  });
});

describe("resolveRequestOrigin", () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    headers.mockReset();
  });

  it("uses canonical env origin when configured", async () => {
    setEnv({
      NEXT_PUBLIC_SITE_URL: "https://example.com/some/path",
      NODE_ENV: "production",
    });
    headers.mockResolvedValueOnce(
      new Headers({ "x-forwarded-host": "evil.example", "x-forwarded-proto": "http" })
    );
    await expect(resolveRequestOrigin()).resolves.toBe("https://example.com");
  });

  it("fails closed to default in production when env is missing", async () => {
    setEnv({ NEXT_PUBLIC_SITE_URL: undefined, NODE_ENV: "production" });
    headers.mockResolvedValueOnce(
      new Headers({ "x-forwarded-host": "evil.example", "x-forwarded-proto": "http" })
    );
    await expect(resolveRequestOrigin()).resolves.toBe("https://co.build");
  });

  it("builds origin from request headers in development", async () => {
    setEnv({ NEXT_PUBLIC_SITE_URL: undefined, NODE_ENV: "development" });
    headers.mockResolvedValueOnce(
      new Headers({ "x-forwarded-host": "co.build", "x-forwarded-proto": "https" })
    );
    await expect(resolveRequestOrigin()).resolves.toBe("https://co.build");
  });

  it("returns default when host missing", async () => {
    setEnv({ NEXT_PUBLIC_SITE_URL: undefined, NODE_ENV: "development" });
    headers.mockResolvedValueOnce(new Headers());
    await expect(resolveRequestOrigin()).resolves.toBe("https://co.build");
  });
});
