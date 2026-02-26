import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { generateJwt } = vi.hoisted(() => ({
  generateJwt: vi.fn(),
}));

const { getAddress, isAddress } = vi.hoisted(() => ({
  getAddress: vi.fn(),
  isAddress: vi.fn(),
}));

vi.mock("@coinbase/cdp-sdk/auth", () => ({ generateJwt }));
vi.mock("viem", () => ({ getAddress, isAddress }));

import { getCoinbaseOnrampUrl } from "./onramp-url";

const ORIGINAL_ENV = { ...process.env };

function setEnv(overrides: Record<string, string | undefined>) {
  process.env = { ...ORIGINAL_ENV, ...overrides };
}

describe("getCoinbaseOnrampUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setEnv({
      CDP_API_KEY_ID: "key",
      CDP_API_KEY_SECRET: "secret",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = { ...ORIGINAL_ENV };
  });

  it("rejects when session missing", async () => {
    const result = await getCoinbaseOnrampUrl(null, {}, "https://co.build");
    expect(result).toEqual({ ok: false, status: 401, error: "Unauthorized" });
  });

  it("rejects invalid body", async () => {
    const result = await getCoinbaseOnrampUrl("0xabc", "bad", "https://co.build");
    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "Invalid request body",
    });
  });

  it("rejects invalid address", async () => {
    isAddress.mockReturnValueOnce(false);
    const result = await getCoinbaseOnrampUrl("0xabc", { address: "nope" }, "https://co.build");
    expect(result).toEqual({ ok: false, status: 400, error: "Invalid address" });
  });

  it("rejects mismatched address", async () => {
    isAddress.mockReturnValueOnce(true);
    getAddress.mockReturnValueOnce("0xDEF");
    const result = await getCoinbaseOnrampUrl("0xabc", { address: "0xdef" }, "https://co.build");
    expect(result).toEqual({ ok: false, status: 403, error: "Address mismatch" });
  });

  it("rejects preset fiat amount below minimum", async () => {
    isAddress.mockReturnValueOnce(true);
    getAddress.mockReturnValueOnce("0xabc");
    const result = await getCoinbaseOnrampUrl(
      "0xabc",
      { address: "0xabc", presetFiatAmount: 1 },
      "https://co.build"
    );
    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "Minimum amount is $2",
    });
  });

  it("rejects preset crypto amount when non-positive", async () => {
    isAddress.mockReturnValueOnce(true);
    getAddress.mockReturnValueOnce("0xabc");
    const result = await getCoinbaseOnrampUrl(
      "0xabc",
      { address: "0xabc", presetCryptoAmount: 0 },
      "https://co.build"
    );
    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "presetCryptoAmount must be a positive number",
    });
  });

  it("rejects non-string fiat currency", async () => {
    isAddress.mockReturnValueOnce(true);
    getAddress.mockReturnValueOnce("0xabc");
    const result = await getCoinbaseOnrampUrl(
      "0xabc",
      { address: "0xabc", fiatCurrency: 123 },
      "https://co.build"
    );
    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "fiatCurrency must be a string",
    });
  });

  it("rejects when Coinbase CDP env missing", async () => {
    setEnv({ CDP_API_KEY_ID: undefined, CDP_API_KEY_SECRET: undefined });
    isAddress.mockReturnValueOnce(true);
    getAddress.mockReturnValueOnce("0xabc");
    const result = await getCoinbaseOnrampUrl("0xabc", { address: "0xabc" }, "https://co.build");
    expect(result).toEqual({
      ok: false,
      status: 500,
      error: "Server not configured for Coinbase CDP",
    });
  });

  it("returns upstream errors when session token request fails", async () => {
    isAddress.mockReturnValueOnce(true);
    getAddress.mockReturnValueOnce("0xabc");
    generateJwt.mockResolvedValueOnce("jwt");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      text: vi.fn().mockResolvedValue("bad"),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getCoinbaseOnrampUrl("0xabc", { address: "0xabc" }, "https://co.build");

    expect(result).toEqual({
      ok: false,
      status: 502,
      error: "session token failed: bad",
    });
  });

  it("returns onramp url on success", async () => {
    isAddress.mockReturnValueOnce(true);
    getAddress.mockReturnValueOnce("0xAbC");
    generateJwt.mockResolvedValueOnce("jwt");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ token: "session-token" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getCoinbaseOnrampUrl(
      "0xabc",
      {
        address: "0xabc",
        presetFiatAmount: 10,
        presetCryptoAmount: 2,
        fiatCurrency: "USD",
        redirectUrl: "/return",
      },
      "https://co.build"
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      const url = new URL(result.data.url);
      expect(url.origin + url.pathname).toBe("https://pay.coinbase.com/buy");
      expect(url.searchParams.get("sessionToken")).toBe("session-token");
      expect(url.searchParams.get("defaultAsset")).toBe("USDC");
      expect(url.searchParams.get("defaultNetwork")).toBe("base");
      expect(url.searchParams.get("presetFiatAmount")).toBe("10");
      expect(url.searchParams.get("presetCryptoAmount")).toBe("2");
      expect(url.searchParams.get("fiatCurrency")).toBe("USD");
      expect(url.searchParams.get("redirectUrl")).toBe("https://co.build/return");
      expect(url.searchParams.get("partnerUserId")).toBe("0xabc");
    }
  });

  it("falls back to same-origin redirect", async () => {
    isAddress.mockReturnValueOnce(true);
    getAddress.mockReturnValueOnce("0xabc");
    generateJwt.mockResolvedValueOnce("jwt");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ token: "session-token" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getCoinbaseOnrampUrl(
      "0xabc",
      { address: "0xabc", redirectUrl: "https://evil.com" },
      "https://co.build"
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      const url = new URL(result.data.url);
      expect(url.searchParams.get("redirectUrl")).toBe("https://co.build/onramp-return");
    }
  });
});
