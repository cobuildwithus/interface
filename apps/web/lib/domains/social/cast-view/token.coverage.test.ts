import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("server-only", () => ({}));

const HASH = "a".repeat(40);
const NOW = 1_700_000_000_000;

function makeHeaders(overrides: Record<string, string> = {}) {
  return new Headers({
    "user-agent": "test-agent",
    "x-forwarded-for": "1.2.3.4, 5.6.7.8",
    ...overrides,
  });
}

describe("cast view tokens", () => {
  beforeEach(() => {
    process.env.CAST_VIEW_TOKEN_SECRET = "test-secret";
    vi.resetModules();
  });

  afterEach(() => {
    delete process.env.CAST_VIEW_TOKEN_SECRET;
    vi.resetModules();
  });

  it("creates and verifies a token", async () => {
    const { createViewToken, verifyViewToken } = await import("./token");
    const headers = makeHeaders();

    const token = createViewToken(HASH, headers, NOW);
    expect(token).toBeTruthy();
    expect(verifyViewToken(token, HASH, headers, NOW)).toBe(true);
  });

  it("rejects mismatched hashes", async () => {
    const { createViewToken, verifyViewToken } = await import("./token");
    const headers = makeHeaders();

    const token = createViewToken(HASH, headers, NOW);
    expect(verifyViewToken(token, "b".repeat(40), headers, NOW)).toBe(false);
  });

  it("rejects missing tokens when enabled", async () => {
    const { verifyViewToken } = await import("./token");
    const headers = makeHeaders();

    expect(verifyViewToken(null, HASH, headers, NOW)).toBe(false);
  });

  it("rejects expired or future tokens", async () => {
    const { createViewToken, verifyViewToken } = await import("./token");
    const headers = makeHeaders();

    const token = createViewToken(HASH, headers, NOW);
    expect(verifyViewToken(token, HASH, headers, NOW + 6 * 60 * 1000)).toBe(false);
    expect(verifyViewToken(token, HASH, headers, NOW - 6 * 60 * 1000)).toBe(false);
  });

  it("rejects bad signatures", async () => {
    const { createViewToken, verifyViewToken } = await import("./token");
    const headers = makeHeaders();

    const token = createViewToken(HASH, headers, NOW);
    const [payload] = token?.split(".") ?? [];
    expect(verifyViewToken(`${payload}.AA`, HASH, headers, NOW)).toBe(false);
  });

  it("rejects invalid token payloads", async () => {
    const { verifyViewToken } = await import("./token");
    const headers = makeHeaders();

    expect(verifyViewToken("nope", HASH, headers, NOW)).toBe(false);
    expect(verifyViewToken("aGVsbG8=.bad", HASH, headers, NOW)).toBe(false);
    expect(verifyViewToken("%%%.__", HASH, headers, NOW)).toBe(false);
    const payload = Buffer.from(JSON.stringify({ t: NOW }), "utf8").toString("base64url");
    expect(verifyViewToken(`${payload}.AA`, HASH, headers, NOW)).toBe(false);
    const badTime = Buffer.from(JSON.stringify({ h: HASH, t: "nope" }), "utf8").toString(
      "base64url"
    );
    expect(verifyViewToken(`${badTime}.AA`, HASH, headers, NOW)).toBe(false);
  });

  it("handles base64 decode errors", async () => {
    const { verifyViewToken } = await import("./token");
    const headers = makeHeaders();
    const spy = vi.spyOn(Buffer, "from").mockImplementationOnce(() => {
      throw new Error("boom");
    });

    expect(verifyViewToken("YQ.AA", HASH, headers, NOW)).toBe(false);
    spy.mockRestore();
  });

  it("reads client ip from headers", async () => {
    const { readClientIpFromHeaders } = await import("./token");

    expect(readClientIpFromHeaders(makeHeaders())).toBe("1.2.3.4");
    expect(
      readClientIpFromHeaders(makeHeaders({ "x-forwarded-for": "", "x-real-ip": "9.9.9.9" }))
    ).toBe("9.9.9.9");
    expect(
      readClientIpFromHeaders(
        makeHeaders({ "x-forwarded-for": "", "x-real-ip": "", "cf-connecting-ip": "8.8.8.8" })
      )
    ).toBe("8.8.8.8");
    expect(
      readClientIpFromHeaders(
        makeHeaders({ "x-forwarded-for": "", "x-real-ip": "", "cf-connecting-ip": "" })
      )
    ).toBeNull();
  });

  it("handles tokens without ip headers", async () => {
    const { createViewToken, verifyViewToken } = await import("./token");
    const headers = makeHeaders({
      "x-forwarded-for": "",
      "x-real-ip": "",
      "cf-connecting-ip": "",
    });

    const token = createViewToken(HASH, headers, NOW);
    expect(verifyViewToken(token, HASH, headers, NOW)).toBe(true);
  });

  it("handles missing user-agent headers", async () => {
    const { createViewToken, verifyViewToken } = await import("./token");
    const headers = new Headers({
      "x-forwarded-for": "1.2.3.4",
    });

    const token = createViewToken(HASH, headers, NOW);
    expect(verifyViewToken(token, HASH, headers, NOW)).toBe(true);
  });
});

describe("cast view tokens without secret", () => {
  beforeEach(() => {
    delete process.env.CAST_VIEW_TOKEN_SECRET;
    vi.resetModules();
  });

  it("skips token creation and verification", async () => {
    const { createViewToken, verifyViewToken, isViewTokenEnabled } = await import("./token");
    const headers = makeHeaders();

    expect(isViewTokenEnabled()).toBe(false);
    expect(createViewToken(HASH, headers, NOW)).toBeNull();
    expect(verifyViewToken(null, HASH, headers, NOW)).toBe(true);
  });
});
