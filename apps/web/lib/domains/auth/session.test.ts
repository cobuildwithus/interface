import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getPrivyLinkedIdentity, getSession, getUser } from "./session";
import {
  getFarcasterByVerifiedAddress,
  getProfileMetaByFid,
} from "@/lib/integrations/farcaster/profile";
import { jwtVerify, importSPKI } from "jose";
import { cookies } from "next/headers";

vi.mock("server-only", () => ({}));

const mockCookies = vi.mocked(cookies);
const mockJwtVerify = vi.mocked(jwtVerify);
const mockImportSPKI = vi.mocked(importSPKI);
const mockGetFarcasterByVerifiedAddress = vi.mocked(getFarcasterByVerifiedAddress);
const mockGetProfileMetaByFid = vi.mocked(getProfileMetaByFid);

vi.mock("next/headers", () => {
  return {
    cookies: vi.fn(),
  };
});

vi.mock("jose", () => {
  return {
    jwtVerify: vi.fn(),
    importSPKI: vi.fn(),
  };
});

vi.mock("@/lib/integrations/farcaster/profile", () => ({
  getFarcasterByVerifiedAddress: vi.fn(),
  getProfileMetaByFid: vi.fn(),
}));

const walletAddress = "0x0000000000000000000000000000000000000001";
const token = "privy-token";

type JwtPayload = Awaited<ReturnType<typeof jwtVerify>>["payload"];
type CookieStore = Awaited<ReturnType<typeof cookies>>;
type CookieValue = NonNullable<ReturnType<CookieStore["get"]>>;

const mockCryptoKey: CryptoKey = {
  type: "public",
  extractable: false,
  algorithm: { name: "ES256" },
  usages: [],
};

const buildJwtResult = (payload: JwtPayload): Awaited<ReturnType<typeof jwtVerify>> => ({
  payload,
  protectedHeader: { alg: "ES256" },
  key: mockCryptoKey,
});

function buildCookieStore(value?: string): CookieStore {
  const store = new Map<string, CookieValue>();
  if (value) {
    store.set("privy-id-token", { name: "privy-id-token", value });
  }
  const resolveName = (input?: string | CookieValue) =>
    typeof input === "string" ? input : input?.name;

  const get: CookieStore["get"] = (input) => {
    const name = resolveName(input);
    return name ? store.get(name) : undefined;
  };
  const getAll: CookieStore["getAll"] = (...args) => {
    const name = resolveName(args[0]);
    if (!name) return Array.from(store.values());
    const cookie = store.get(name);
    return cookie ? [cookie] : [];
  };

  const cookieStore: CookieStore = {
    get,
    getAll,
    has: (name) => store.has(name),
    set: ((...args: Parameters<CookieStore["set"]>) => {
      const [keyOrCookie, valueOrOptions] = args;
      const name = typeof keyOrCookie === "string" ? keyOrCookie : keyOrCookie.name;
      if (typeof keyOrCookie === "string") {
        if (typeof valueOrOptions !== "string") return cookieStore;
        store.set(name, { name, value: valueOrOptions });
        return cookieStore;
      }
      store.set(name, { name, value: keyOrCookie.value });
      return cookieStore;
    }) as CookieStore["set"],
    delete: ((...args: Parameters<CookieStore["delete"]>) => {
      const [keyOrCookie] = args;
      const name = typeof keyOrCookie === "string" ? keyOrCookie : keyOrCookie.name;
      store.delete(name);
      return cookieStore;
    }) as CookieStore["delete"],
    get size() {
      return store.size;
    },
    [Symbol.iterator]: () => store.entries(),
    toString: () => "",
  };

  return cookieStore;
}

function mockCookieValue(value?: string) {
  mockCookies.mockResolvedValue(buildCookieStore(value));
}

describe("session auth helpers", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.NEXT_PUBLIC_PRIVY_APP_ID = "app-id";
    process.env.PRIVY_VERIFICATION_KEY = "test-public-key";
    mockImportSPKI.mockResolvedValue(mockCryptoKey);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("getUser returns undefined when no privy cookie", async () => {
    mockCookieValue();

    const user = await getUser();

    expect(user).toBeUndefined();
    expect(mockJwtVerify).not.toHaveBeenCalled();
  });

  it("getUser returns wallet address when token is valid", async () => {
    mockCookieValue(token);
    mockJwtVerify.mockResolvedValue(
      buildJwtResult({
        sub: "user-1",
        linked_accounts: JSON.stringify([{ type: "wallet", address: walletAddress }]),
      })
    );

    const user = await getUser();

    expect(user).toBe(walletAddress);
    expect(mockJwtVerify).toHaveBeenCalledWith(
      token,
      expect.any(Object),
      expect.objectContaining({ issuer: "privy.io", audience: "app-id" })
    );
  });

  it("getPrivyLinkedIdentity returns identity when token is valid", async () => {
    mockCookieValue(token);
    mockJwtVerify.mockResolvedValue(
      buildJwtResult({
        sub: "user-1",
        linked_accounts: JSON.stringify([
          { type: "wallet", address: walletAddress },
          { type: "farcaster", fid: 123, username: "alice" },
          { type: "twitter_oauth", username: "alice_x", subject: "123" },
        ]),
      })
    );

    const identity = await getPrivyLinkedIdentity();

    expect(identity).toEqual({
      wallet: { address: walletAddress },
      farcaster: { fid: 123, username: "alice" },
      twitter: { username: "alice_x", subject: "123" },
    });
  });

  it("getPrivyLinkedIdentity returns undefined when token is invalid", async () => {
    mockCookieValue(token);
    mockJwtVerify.mockRejectedValue(new Error("invalid token"));

    const identity = await getPrivyLinkedIdentity();

    expect(identity).toBeUndefined();
  });

  it("getSession returns privy farcaster and twitter accounts", async () => {
    mockCookieValue(token);
    mockJwtVerify.mockResolvedValue(
      buildJwtResult({
        sub: "user-1",
        linked_accounts: JSON.stringify([
          { type: "wallet", address: walletAddress },
          { type: "farcaster", fid: 123, username: "alice" },
          { type: "twitter_oauth", username: "alice_x" },
        ]),
      })
    );
    mockGetProfileMetaByFid.mockResolvedValue({ bio: "hello world", neynarScore: 0.85 });

    const session = await getSession();

    expect(session.farcaster).toEqual({
      fid: 123,
      username: "alice",
      displayName: undefined,
      pfp: undefined,
      bio: "hello world",
      neynarScore: 0.85,
      source: "privy",
    });
    expect(session.twitter).toEqual({
      username: "alice_x",
      name: undefined,
      profilePictureUrl: undefined,
      subject: undefined,
    });
    expect(mockGetProfileMetaByFid).toHaveBeenCalledWith(123);
    expect(mockGetFarcasterByVerifiedAddress).not.toHaveBeenCalled();
  });

  it("getSession falls back to verified address when privy farcaster is missing", async () => {
    mockCookieValue(token);
    mockJwtVerify.mockResolvedValue(
      buildJwtResult({
        sub: "user-1",
        linked_accounts: JSON.stringify([{ type: "wallet", address: walletAddress }]),
      })
    );
    mockGetFarcasterByVerifiedAddress.mockResolvedValue({
      fid: 456,
      username: "bob",
      displayName: "Bob",
      pfp: "https://bob.png",
      neynarScore: 0.72,
    });

    const session = await getSession();

    expect(session.farcaster).toEqual({
      fid: 456,
      username: "bob",
      displayName: "Bob",
      pfp: "https://bob.png",
      neynarScore: 0.72,
      source: "verified_address",
    });
    expect(session.twitter).toBeUndefined();
    expect(mockGetFarcasterByVerifiedAddress).toHaveBeenCalledWith(walletAddress);
    expect(mockGetProfileMetaByFid).not.toHaveBeenCalled();
  });

  it("getSession returns empty object when jwt verification fails", async () => {
    mockCookieValue(token);
    mockJwtVerify.mockRejectedValue(new Error("invalid token"));

    const session = await getSession();
    const user = await getUser();

    expect(session).toEqual({});
    expect(user).toBeUndefined();
  });

  it("getSession returns empty object when no cookie", async () => {
    mockCookieValue();

    const session = await getSession();

    expect(session).toEqual({});
  });

  it("getSession returns address from wallet", async () => {
    mockCookieValue(token);
    mockJwtVerify.mockResolvedValue(
      buildJwtResult({
        sub: "user-1",
        linked_accounts: JSON.stringify([{ type: "wallet", address: walletAddress }]),
      })
    );
    mockGetFarcasterByVerifiedAddress.mockResolvedValue(undefined);

    const session = await getSession();

    expect(session.address).toBe(walletAddress);
    expect(session.farcaster).toBeUndefined();
  });

  it("getSession returns undefined farcaster when verified address lookup fails", async () => {
    mockCookieValue(token);
    mockJwtVerify.mockResolvedValue(
      buildJwtResult({
        sub: "user-1",
        linked_accounts: JSON.stringify([{ type: "wallet", address: walletAddress }]),
      })
    );
    mockGetFarcasterByVerifiedAddress.mockResolvedValue(undefined);

    const session = await getSession();

    expect(session.farcaster).toBeUndefined();
    expect(mockGetFarcasterByVerifiedAddress).toHaveBeenCalledWith(walletAddress);
  });

  it("getSession handles null neynar score for privy farcaster", async () => {
    mockCookieValue(token);
    mockJwtVerify.mockResolvedValue(
      buildJwtResult({
        sub: "user-1",
        linked_accounts: JSON.stringify([
          { type: "wallet", address: walletAddress },
          { type: "farcaster", fid: 123, username: "alice" },
        ]),
      })
    );
    mockGetProfileMetaByFid.mockResolvedValue({ bio: undefined, neynarScore: null });

    const session = await getSession();

    expect(session.farcaster?.neynarScore).toBeNull();
    expect(mockGetProfileMetaByFid).toHaveBeenCalledWith(123);
  });

  it("getUser returns undefined when wallet not in linked accounts", async () => {
    mockCookieValue(token);
    mockJwtVerify.mockResolvedValue(
      buildJwtResult({
        sub: "user-1",
        linked_accounts: JSON.stringify([{ type: "farcaster", fid: 123, username: "alice" }]),
      })
    );

    const user = await getUser();

    expect(user).toBeUndefined();
  });

  it("getSession returns undefined address when no wallet linked", async () => {
    mockCookieValue(token);
    mockJwtVerify.mockResolvedValue(
      buildJwtResult({
        sub: "user-1",
        linked_accounts: JSON.stringify([{ type: "farcaster", fid: 123, username: "alice" }]),
      })
    );
    mockGetProfileMetaByFid.mockResolvedValue({ bio: undefined, neynarScore: 0.8 });

    const session = await getSession();

    expect(session.address).toBeUndefined();
    expect(session.farcaster).toBeDefined();
  });
});
