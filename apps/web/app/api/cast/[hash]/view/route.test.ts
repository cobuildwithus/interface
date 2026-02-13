import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  normalizeCastHashRawMock,
  getUserMock,
  markCastReadMock,
  queryRawMock,
  findFirstMock,
  kvGetMock,
  kvSetMock,
  verifyViewTokenMock,
  readClientIpMock,
} = vi.hoisted(() => ({
  normalizeCastHashRawMock: vi.fn(),
  getUserMock: vi.fn(),
  markCastReadMock: vi.fn(),
  queryRawMock: vi.fn(),
  findFirstMock: vi.fn(),
  kvGetMock: vi.fn(),
  kvSetMock: vi.fn(),
  verifyViewTokenMock: vi.fn(),
  readClientIpMock: vi.fn(),
}));

vi.mock("@/lib/domains/rules/cast-rules/normalize", () => ({
  normalizeCastHashRaw: (...args: Parameters<typeof normalizeCastHashRawMock>) =>
    normalizeCastHashRawMock(...args),
}));

vi.mock("@/lib/domains/auth/session", () => ({
  getUser: (...args: Parameters<typeof getUserMock>) => getUserMock(...args),
}));

vi.mock("@/lib/domains/social/cast-read/kv", () => ({
  markCastRead: (...args: Parameters<typeof markCastReadMock>) => markCastReadMock(...args),
}));

vi.mock("@/lib/server/db/cobuild-db-client", () => ({
  default: {
    $replica: () => ({
      farcasterCast: {
        findFirst: (...args: Parameters<typeof findFirstMock>) => findFirstMock(...args),
      },
    }),
    $primary: () => ({
      $queryRaw: (...args: Parameters<typeof queryRawMock>) => queryRawMock(...args),
    }),
  },
}));

vi.mock("@vercel/kv", () => ({
  kv: {
    get: (...args: Parameters<typeof kvGetMock>) => kvGetMock(...args),
    set: (...args: Parameters<typeof kvSetMock>) => kvSetMock(...args),
  },
}));

vi.mock("@/lib/domains/social/cast-view/token", () => ({
  verifyViewToken: (...args: Parameters<typeof verifyViewTokenMock>) =>
    verifyViewTokenMock(...args),
  readClientIpFromHeaders: (...args: Parameters<typeof readClientIpMock>) =>
    readClientIpMock(...args),
}));

import { POST } from "./route";

const baseUrl = "http://localhost";
const validHash = "a".repeat(40);

function buildRequest(
  url: string,
  headers: Record<string, string> = {}
): Request & { nextUrl: URL } {
  const req = new Request(url, { method: "POST", headers });
  (req as Request & { nextUrl: URL }).nextUrl = new URL(url);
  return req as Request & { nextUrl: URL };
}

describe("POST /api/cast/[hash]/view", () => {
  beforeEach(() => {
    normalizeCastHashRawMock.mockReset();
    getUserMock.mockReset();
    markCastReadMock.mockReset();
    queryRawMock.mockReset();
    findFirstMock.mockReset();
    kvGetMock.mockReset();
    kvSetMock.mockReset();
    verifyViewTokenMock.mockReset();
    readClientIpMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 400 for invalid hash", async () => {
    normalizeCastHashRawMock.mockReturnValue(null);

    const req = buildRequest(`${baseUrl}/api/cast/${validHash}/view`, {
      origin: baseUrl,
    });

    const res = await POST(req as never, { params: Promise.resolve({ hash: "bad" }) });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "Invalid cast hash." });
  });

  it("returns 403 for cross-origin requests", async () => {
    normalizeCastHashRawMock.mockReturnValue(validHash);

    const req = buildRequest(`${baseUrl}/api/cast/${validHash}/view`, {
      origin: "https://evil.com",
    });

    const res = await POST(req as never, { params: Promise.resolve({ hash: validHash }) });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ ok: false, error: "Forbidden." });
  });

  it("returns 401 when view token is invalid", async () => {
    normalizeCastHashRawMock.mockReturnValue(validHash);
    verifyViewTokenMock.mockReturnValue(false);

    const req = buildRequest(`${baseUrl}/api/cast/${validHash}/view`, {
      origin: baseUrl,
      "x-cobuild-view-token": "token",
      "user-agent": "Mozilla/5.0",
    });

    const res = await POST(req as never, { params: Promise.resolve({ hash: validHash }) });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ ok: false, error: "Unauthorized." });
  });

  it("returns 429 when rate limited", async () => {
    normalizeCastHashRawMock.mockReturnValue(validHash);
    verifyViewTokenMock.mockReturnValue(true);
    getUserMock.mockResolvedValue(null);
    readClientIpMock.mockReturnValue("1.2.3.4");

    const now = 1_700_000_000_000;
    vi.spyOn(Date, "now").mockReturnValue(now);

    const windowStart = Math.floor(now / 1000 / 10) * 10;
    kvGetMock.mockResolvedValue({ count: 30, windowStart });
    findFirstMock.mockResolvedValue({ parentHash: null });

    const req = buildRequest(`${baseUrl}/api/cast/${validHash}/view`, {
      origin: baseUrl,
      "x-cobuild-view-token": "token",
      "user-agent": "Mozilla/5.0",
    });

    const res = await POST(req as never, { params: Promise.resolve({ hash: validHash }) });
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).not.toBeNull();
  });

  it("counts a new view and returns view count", async () => {
    normalizeCastHashRawMock.mockReturnValue(validHash);
    verifyViewTokenMock.mockReturnValue(true);
    getUserMock.mockResolvedValue("0xAbC0000000000000000000000000000000000000");
    readClientIpMock.mockReturnValue("1.2.3.4");

    findFirstMock.mockResolvedValueOnce({ parentHash: null });
    queryRawMock.mockResolvedValueOnce([{ viewCount: 12n }]);
    kvGetMock.mockResolvedValue(null);
    kvSetMock.mockResolvedValue("OK");

    const req = buildRequest(`${baseUrl}/api/cast/${validHash}/view`, {
      origin: baseUrl,
      "x-cobuild-view-token": "token",
      "user-agent": "Mozilla/5.0",
    });

    const res = await POST(req as never, { params: Promise.resolve({ hash: validHash }) });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, counted: true, viewCount: 12 });
    expect(markCastReadMock).toHaveBeenCalledWith(
      "0xabc0000000000000000000000000000000000000",
      validHash
    );
  });
});
