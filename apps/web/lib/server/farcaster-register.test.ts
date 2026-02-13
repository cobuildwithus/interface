import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  revalidateTag,
  getClient,
  getNeynarWalletId,
  neynarCreateSigner,
  neynarGetFreshAccountFid,
  neynarRegisterAccount,
  getFidsByUsernames,
  saveVerifiedAddressForFid,
  setSignerRecord,
  upsertLinkedAccount,
  getSignerStatusCacheTag,
  getSignerStatusUuidCacheTag,
  isValidFarcasterUsername,
  normalizeFarcasterUsername,
  signedMetadataMock,
} = vi.hoisted(() => ({
  revalidateTag: vi.fn(),
  getClient: vi.fn(),
  getNeynarWalletId: vi.fn(),
  neynarCreateSigner: vi.fn(),
  neynarGetFreshAccountFid: vi.fn(),
  neynarRegisterAccount: vi.fn(),
  getFidsByUsernames: vi.fn(),
  saveVerifiedAddressForFid: vi.fn(),
  setSignerRecord: vi.fn(),
  upsertLinkedAccount: vi.fn(),
  getSignerStatusCacheTag: vi.fn((fid: number) => `signer:${fid}`),
  getSignerStatusUuidCacheTag: vi.fn((uuid: string) => `signer:uuid:${uuid}`),
  isValidFarcasterUsername: vi.fn(),
  normalizeFarcasterUsername: vi.fn(),
  signedMetadataMock: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidateTag }));
vi.mock("@/lib/domains/token/onchain/clients", () => ({ getClient }));
vi.mock("@/lib/integrations/farcaster/neynar-client", () => ({
  getNeynarWalletId,
  neynarCreateSigner,
  neynarGetFreshAccountFid,
  neynarRegisterAccount,
}));
vi.mock("@/lib/integrations/farcaster/profile", () => ({ getFidsByUsernames }));
vi.mock("@/lib/integrations/farcaster/save-verified-address", () => ({
  saveVerifiedAddressForFid,
}));
vi.mock("@/lib/integrations/farcaster/signer-store", () => ({ setSignerRecord }));
vi.mock("@/lib/integrations/farcaster/signer-status", () => ({
  getSignerStatusCacheTag,
  getSignerStatusUuidCacheTag,
}));
vi.mock("@/lib/domains/auth/linked-accounts/store", () => ({ upsertLinkedAccount }));
vi.mock("@/lib/integrations/farcaster/fname", () => ({
  isValidFarcasterUsername,
  normalizeFarcasterUsername,
}));

vi.mock("@farcaster/core", () => ({
  ViemLocalEip712Signer: class {
    getSignedKeyRequestMetadata = signedMetadataMock;
  },
}));

vi.mock("viem", () => ({
  bytesToHex: () => "0xsigned",
  getAddress: (value: string) => value.toLowerCase(),
  hexToBytes: () => new Uint8Array([1, 2, 3]),
  isAddress: (value: string) => value.startsWith("0x") && value.length > 4,
}));

vi.mock("viem/accounts", () => ({
  mnemonicToAccount: () => ({ address: "0xapp" }),
}));

vi.mock("viem/chains", () => ({ optimism: { id: 10 } }));

vi.mock("@/lib/integrations/farcaster/id-registry", () => ({
  ID_REGISTRY_ABI: [{ name: "nonces" }],
  ID_REGISTRY_ADDRESS: "0xregistry",
}));

import type { Session } from "./session-types";
import { completeFarcasterRegistration, initFarcasterRegistration } from "./farcaster-register";

const ORIGINAL_ENV = { ...process.env };
let nowSpy: ReturnType<typeof vi.spyOn> | null = null;
const validSignature = `0x${"a".repeat(12)}`;
const validDeadline = 1_700_000_100;
const baseAddress = "0xabc";

function setEnv(overrides: Record<string, string | undefined>) {
  process.env = { ...ORIGINAL_ENV, ...overrides };
}

type SessionOverrides = Omit<Partial<Session>, "farcaster"> & {
  farcaster?: Partial<NonNullable<Session["farcaster"]>> | null;
};

const makeSession = (overrides: SessionOverrides = {}) =>
  ({ ...overrides }) as Partial<Session> as Session;

describe("farcaster-register", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    setEnv({
      FARCASTER_APP_FID: "999",
      FARCASTER_APP_MNEMONIC: "test mnemonic",
    });
    getNeynarWalletId.mockReturnValue("wallet");
    getClient.mockReturnValue({
      readContract: vi.fn().mockResolvedValue(1n),
    });
    neynarGetFreshAccountFid.mockResolvedValue({ ok: true, fid: 123 });
    getFidsByUsernames.mockResolvedValue({ fids: [] });
    isValidFarcasterUsername.mockReturnValue(true);
    normalizeFarcasterUsername.mockReturnValue("username");
    getSignerStatusCacheTag.mockImplementation((fid: number) => `signer:${fid}`);
    getSignerStatusUuidCacheTag.mockImplementation((uuid: string) => `signer:uuid:${uuid}`);
    signedMetadataMock.mockResolvedValue({ isOk: () => true, value: new Uint8Array([1]) });
    neynarCreateSigner.mockResolvedValue({
      ok: true,
      signerUuid: "uuid",
      publicKey: "0xkey",
      permissions: ["write_all"],
    });
    neynarRegisterAccount.mockResolvedValue({ ok: true });
    nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
  });

  afterEach(() => {
    nowSpy?.mockRestore();
    nowSpy = null;
    process.env = { ...ORIGINAL_ENV };
  });

  it("init requires a connected wallet", async () => {
    const session = makeSession();
    const result = await initFarcasterRegistration(session, {});
    expect(result).toEqual({
      ok: false,
      status: 401,
      error: "Connect a wallet before creating a Farcaster account.",
    });
  });

  it("init rejects when farcaster already linked", async () => {
    const session = makeSession({ address: baseAddress, farcaster: { fid: 1 } });
    const result = await initFarcasterRegistration(session, {});
    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "Farcaster is already linked to this account.",
    });
  });

  it("init rejects invalid body", async () => {
    const session = makeSession({ address: baseAddress });
    const result = await initFarcasterRegistration(session, "bad");
    expect(result).toEqual({ ok: false, status: 400, error: "Invalid JSON body." });
  });

  it("init rejects invalid custody address", async () => {
    const session = makeSession({ address: baseAddress });
    const result = await initFarcasterRegistration(session, { custodyAddress: "bad" });
    expect(result).toEqual({ ok: false, status: 400, error: "Invalid custody address." });
  });

  it("init rejects custody mismatch", async () => {
    const session = makeSession({ address: baseAddress });
    const result = await initFarcasterRegistration(session, { custodyAddress: "0xdef" });
    expect(result).toEqual({
      ok: false,
      status: 403,
      error: "Custody address does not match session wallet.",
    });
  });

  it("init rejects missing wallet id", async () => {
    getNeynarWalletId.mockReturnValueOnce("");
    const session = makeSession({ address: baseAddress });
    const result = await initFarcasterRegistration(session, { custodyAddress: baseAddress });
    expect(result).toEqual({
      ok: false,
      status: 500,
      error: "Neynar wallet ID not configured.",
    });
  });

  it("init returns neynar errors", async () => {
    neynarGetFreshAccountFid.mockResolvedValueOnce({ ok: false, error: "bad" });
    const session = makeSession({ address: baseAddress });
    const result = await initFarcasterRegistration(session, { custodyAddress: baseAddress });
    expect(result).toEqual({ ok: false, status: 502, error: "bad" });
  });

  it("init returns typed data on success", async () => {
    const session = makeSession({ address: baseAddress });
    const result = await initFarcasterRegistration(session, { custodyAddress: baseAddress });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.fid).toBe(123);
      expect(result.data.deadline).toBe(1_700_000_000 + 600);
      expect(result.data.typedData.message).toEqual({
        fid: "123",
        to: "0xabc",
        nonce: "1",
        deadline: String(1_700_000_000 + 600),
      });
    }
  });

  it("complete requires a connected wallet", async () => {
    const result = await completeFarcasterRegistration(makeSession(), {});
    expect(result).toEqual({
      ok: false,
      status: 401,
      error: "Connect a wallet before creating a Farcaster account.",
    });
  });

  it("complete rejects existing farcaster", async () => {
    const session = makeSession({ address: baseAddress, farcaster: { fid: 1 } });
    const result = await completeFarcasterRegistration(session, {});
    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "Farcaster is already linked to this account.",
    });
  });

  it("complete rejects invalid body", async () => {
    const session = makeSession({ address: baseAddress });
    const result = await completeFarcasterRegistration(session, "bad");
    expect(result).toEqual({ ok: false, status: 400, error: "Invalid JSON body." });
  });

  it("complete rejects invalid custody address", async () => {
    const session = makeSession({ address: baseAddress });
    const result = await completeFarcasterRegistration(session, { custodyAddress: "bad" });
    expect(result).toEqual({ ok: false, status: 400, error: "Invalid custody address." });
  });

  it("complete rejects custody mismatch", async () => {
    const session = makeSession({ address: baseAddress });
    const result = await completeFarcasterRegistration(session, { custodyAddress: "0xdef" });
    expect(result).toEqual({
      ok: false,
      status: 403,
      error: "Custody address does not match session wallet.",
    });
  });

  it("complete rejects invalid fid", async () => {
    const session = makeSession({ address: baseAddress });
    const result = await completeFarcasterRegistration(session, {
      custodyAddress: baseAddress,
      fid: 0,
    });
    expect(result).toEqual({ ok: false, status: 400, error: "Invalid fid." });
  });

  it("complete rejects invalid signature", async () => {
    const session = makeSession({ address: baseAddress });
    const result = await completeFarcasterRegistration(session, {
      custodyAddress: baseAddress,
      fid: 1,
      signature: "bad",
    });
    expect(result).toEqual({ ok: false, status: 400, error: "Invalid signature." });
  });

  it("complete rejects expired signature", async () => {
    const session = makeSession({ address: baseAddress });
    const result = await completeFarcasterRegistration(session, {
      custodyAddress: baseAddress,
      fid: 1,
      signature: validSignature,
      deadline: 1_600_000_000,
    });
    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "Signature has expired. Please try again.",
    });
  });

  it("complete rejects invalid username", async () => {
    normalizeFarcasterUsername.mockReturnValueOnce("");
    isValidFarcasterUsername.mockReturnValueOnce(false);

    const session = makeSession({ address: baseAddress });
    const result = await completeFarcasterRegistration(session, {
      custodyAddress: baseAddress,
      fid: 1,
      signature: validSignature,
      deadline: validDeadline,
      fname: "bad",
    });
    expect(result).toEqual({ ok: false, status: 400, error: "Invalid Farcaster username." });
  });

  it("complete rejects taken username", async () => {
    getFidsByUsernames.mockResolvedValueOnce({ fids: [1] });
    const session = makeSession({ address: baseAddress });
    const result = await completeFarcasterRegistration(session, {
      custodyAddress: baseAddress,
      fid: 1,
      signature: validSignature,
      deadline: validDeadline,
      fname: "user",
    });
    expect(result).toEqual({ ok: false, status: 409, error: "Username is already taken." });
  });

  it("complete rejects missing wallet id", async () => {
    getNeynarWalletId.mockReturnValueOnce("");
    const session = makeSession({ address: baseAddress });
    const result = await completeFarcasterRegistration(session, {
      custodyAddress: baseAddress,
      fid: 1,
      signature: validSignature,
      deadline: validDeadline,
      fname: "user",
    });
    expect(result).toEqual({
      ok: false,
      status: 500,
      error: "Neynar wallet ID not configured.",
    });
  });

  it("complete rejects missing app signer config", async () => {
    setEnv({ FARCASTER_APP_FID: undefined, FARCASTER_APP_MNEMONIC: undefined });
    const session = makeSession({ address: baseAddress });
    const result = await completeFarcasterRegistration(session, {
      custodyAddress: baseAddress,
      fid: 1,
      signature: validSignature,
      deadline: validDeadline,
      fname: "user",
    });
    expect(result).toEqual({
      ok: false,
      status: 500,
      error: "Farcaster app signer not configured.",
    });
  });

  it("complete returns signer creation errors", async () => {
    neynarCreateSigner.mockResolvedValueOnce({ ok: false, error: "bad", status: 503 });
    const session = makeSession({ address: baseAddress });
    const result = await completeFarcasterRegistration(session, {
      custodyAddress: baseAddress,
      fid: 1,
      signature: validSignature,
      deadline: validDeadline,
      fname: "user",
    });
    expect(result).toEqual({ ok: false, status: 503, error: "bad" });
  });

  it("complete rejects signer metadata failures", async () => {
    signedMetadataMock.mockResolvedValueOnce({ isOk: () => false, value: null });
    const session = makeSession({ address: baseAddress });
    const result = await completeFarcasterRegistration(session, {
      custodyAddress: baseAddress,
      fid: 1,
      signature: validSignature,
      deadline: validDeadline,
      fname: "user",
    });
    expect(result).toEqual({
      ok: false,
      status: 500,
      error: "Failed to sign managed signer metadata.",
    });
  });

  it("complete returns register errors", async () => {
    neynarRegisterAccount.mockResolvedValueOnce({ ok: false, error: "bad", status: 502 });
    const session = makeSession({ address: baseAddress });
    const result = await completeFarcasterRegistration(session, {
      custodyAddress: baseAddress,
      fid: 1,
      signature: validSignature,
      deadline: validDeadline,
      fname: "user",
    });
    expect(result).toEqual({ ok: false, status: 502, error: "bad" });
  });

  it("completes registration on success", async () => {
    const session = makeSession({ address: baseAddress });
    const result = await completeFarcasterRegistration(session, {
      custodyAddress: baseAddress,
      fid: 1,
      signature: validSignature,
      deadline: validDeadline,
      fname: "user",
      metadata: { source: "test" },
    });

    expect(setSignerRecord).toHaveBeenCalledWith({
      fid: 1,
      signerUuid: "uuid",
      signerPermissions: ["write_all"],
    });
    expect(upsertLinkedAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerAddress: "0xabc",
        platform: "farcaster",
        platformId: "1",
        username: "username",
      })
    );
    expect(saveVerifiedAddressForFid).toHaveBeenCalledWith(1, "0xabc");
    expect(revalidateTag).toHaveBeenCalledWith("farcaster-profile", "default");
    expect(revalidateTag).toHaveBeenCalledWith("profile-v4", "default");
    expect(revalidateTag).toHaveBeenCalledWith("signer:1", "default");
    expect(revalidateTag).toHaveBeenCalledWith("signer:uuid:uuid", "default");
    expect(result).toEqual({
      ok: true,
      data: { fid: 1, username: "username", signerUuid: "uuid" },
    });
  });
});
