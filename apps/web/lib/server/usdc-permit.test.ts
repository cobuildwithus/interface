import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { createWalletClient, getAddress, parseAbi, parseErc6492Signature, BaseError, http } =
  vi.hoisted(() => {
    class BaseError extends Error {
      shortMessage?: string;
      details?: string;
    }
    return {
      BaseError,
      createWalletClient: vi.fn(),
      getAddress: vi.fn((value: string) => value.toLowerCase()),
      parseAbi: vi.fn(() => [{ name: "permit" }]),
      parseErc6492Signature: vi.fn(() => ({ signature: "0xparsed" })),
      http: vi.fn((url: string) => ({ url })),
    };
  });

const { privateKeyToAccount } = vi.hoisted(() => ({
  privateKeyToAccount: vi.fn(() => ({ address: "0xpermit" })),
}));

const { base } = vi.hoisted(() => ({ base: { id: 8453 } }));

const { getClient, explorerUrl, getChain, getRpcUrl, contracts } = vi.hoisted(() => ({
  getClient: vi.fn(),
  explorerUrl: vi.fn((_chainId: number, hash: string) => `https://explorer/${hash}`),
  getChain: vi.fn(() => ({ id: 8453 })),
  getRpcUrl: vi.fn(() => "https://rpc"),
  contracts: {
    USDCBase: "0x" + "1".repeat(40),
    CobuildSwap: "0x" + "2".repeat(40),
  },
}));

vi.mock("viem", () => ({
  BaseError,
  createWalletClient,
  getAddress,
  http,
  parseAbi,
  parseErc6492Signature,
}));
vi.mock("viem/accounts", () => ({ privateKeyToAccount }));
vi.mock("viem/chains", () => ({ base }));
vi.mock("@/lib/domains/token/onchain/clients", () => ({ getClient }));
vi.mock("@/lib/domains/token/onchain/chains", () => ({
  explorerUrl,
  getChain,
  getRpcUrl,
}));
vi.mock("@/lib/domains/token/onchain/addresses", () => ({ contracts }));

const ORIGINAL_ENV = { ...process.env };

function setEnv(overrides: Record<string, string | undefined>) {
  process.env = { ...ORIGINAL_ENV, ...overrides };
}

async function loadModule() {
  await vi.resetModules();
  return import("./usdc-permit");
}

describe("submitUsdcPermitServer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setEnv({
      USDC_PERMIT_PK: "0x" + "a".repeat(64),
      USDC_SPENDER: undefined,
    });
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("rejects invalid json body", async () => {
    const { submitUsdcPermitServer } = await loadModule();
    const result = await submitUsdcPermitServer("bad");
    expect(result).toEqual({ error: "Invalid JSON body" });
  });

  it("rejects unsupported chain", async () => {
    const { submitUsdcPermitServer } = await loadModule();
    const result = await submitUsdcPermitServer({
      chainId: 1,
      token: contracts.USDCBase,
      owner: "0x" + "3".repeat(40),
      spender: contracts.CobuildSwap,
      value: "1",
      deadline: "1",
      signature: "0xsig",
    });
    expect(result).toEqual({ error: "Unsupported chain/token" });
  });

  it("rejects unsupported token", async () => {
    const { submitUsdcPermitServer } = await loadModule();
    const result = await submitUsdcPermitServer({
      chainId: base.id,
      token: "0x" + "4".repeat(40),
      owner: "0x" + "3".repeat(40),
      spender: contracts.CobuildSwap,
      value: "1",
      deadline: "1",
      signature: "0xsig",
    });
    expect(result).toEqual({ error: "Unsupported chain/token" });
  });

  it("rejects unsupported spender", async () => {
    const { submitUsdcPermitServer } = await loadModule();
    const result = await submitUsdcPermitServer({
      chainId: base.id,
      token: contracts.USDCBase,
      owner: "0x" + "3".repeat(40),
      spender: "0x" + "5".repeat(40),
      value: "1",
      deadline: "1",
      signature: "0xsig",
    });
    expect(result).toEqual({ error: "Unsupported spender" });
  });

  it("requires server wallet configuration", async () => {
    setEnv({ USDC_PERMIT_PK: undefined });
    const { submitUsdcPermitServer } = await loadModule();
    const result = await submitUsdcPermitServer({
      chainId: base.id,
      token: contracts.USDCBase,
      owner: "0x" + "3".repeat(40),
      spender: contracts.CobuildSwap,
      value: "1",
      deadline: "1",
      signature: "0xsig",
    });
    expect(result).toEqual({ error: "Server not configured. Missing USDC_PERMIT_PK." });
  });

  it("submits permits successfully", async () => {
    const writeContract = vi.fn().mockResolvedValue("0xtxhash");
    createWalletClient.mockReturnValueOnce({ writeContract });
    const publicClient = {
      simulateContract: vi.fn().mockResolvedValue({ request: { to: "0xcontract" } }),
      getTransactionCount: vi.fn().mockResolvedValue(1),
    };
    getClient.mockReturnValueOnce(publicClient);

    const { submitUsdcPermitServer } = await loadModule();
    const result = await submitUsdcPermitServer({
      chainId: base.id,
      token: contracts.USDCBase,
      owner: "0x" + "3".repeat(40),
      spender: contracts.CobuildSwap,
      value: "1",
      deadline: "1",
      signature: "0xsig",
    });

    expect(parseErc6492Signature).toHaveBeenCalled();
    expect(publicClient.simulateContract).toHaveBeenCalled();
    expect(writeContract).toHaveBeenCalled();
    expect(result).toEqual({
      success: true,
      txHash: "0xtxhash",
      explorerUrl: "https://explorer/0xtxhash",
    });
  });

  it("retries on nonce too low", async () => {
    const writeContract = vi
      .fn()
      .mockRejectedValueOnce(new Error("nonce too low"))
      .mockResolvedValueOnce("0xtxhash");
    createWalletClient.mockReturnValueOnce({ writeContract });
    const publicClient = {
      simulateContract: vi.fn().mockResolvedValue({ request: { to: "0xcontract" } }),
      getTransactionCount: vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2),
    };
    getClient.mockReturnValueOnce(publicClient);

    const { submitUsdcPermitServer } = await loadModule();
    const result = await submitUsdcPermitServer({
      chainId: base.id,
      token: contracts.USDCBase,
      owner: "0x" + "3".repeat(40),
      spender: contracts.CobuildSwap,
      value: "1",
      deadline: "1",
      signature: "0xsig",
    });

    expect(writeContract).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      success: true,
      txHash: "0xtxhash",
      explorerUrl: "https://explorer/0xtxhash",
    });
  });

  it("uses suggested nonce when provided", async () => {
    const writeContract = vi
      .fn()
      .mockRejectedValueOnce(new Error("nonce too low; next nonce 5"))
      .mockResolvedValueOnce("0xtxhash");
    createWalletClient.mockReturnValueOnce({ writeContract });
    const publicClient = {
      simulateContract: vi.fn().mockResolvedValue({ request: { to: "0xcontract" } }),
      getTransactionCount: vi.fn().mockResolvedValue(1),
    };
    getClient.mockReturnValueOnce(publicClient);

    const { submitUsdcPermitServer } = await loadModule();
    const result = await submitUsdcPermitServer({
      chainId: base.id,
      token: contracts.USDCBase,
      owner: "0x" + "3".repeat(40),
      spender: contracts.CobuildSwap,
      value: "1",
      deadline: "1",
      signature: "0xsig",
    });

    expect(writeContract).toHaveBeenCalledTimes(2);
    expect(writeContract.mock.calls[1]?.[0]?.nonce).toBe(5);
    expect(result).toEqual({
      success: true,
      txHash: "0xtxhash",
      explorerUrl: "https://explorer/0xtxhash",
    });
  });

  it("falls back to raw signature when parsing fails", async () => {
    parseErc6492Signature.mockImplementationOnce(() => {
      throw new Error("not wrapped");
    });
    const writeContract = vi.fn().mockResolvedValue("0xtxhash");
    createWalletClient.mockReturnValueOnce({ writeContract });
    const publicClient = {
      simulateContract: vi.fn().mockResolvedValue({ request: { to: "0xcontract" } }),
      getTransactionCount: vi.fn().mockResolvedValue(1),
    };
    getClient.mockReturnValueOnce(publicClient);

    const { submitUsdcPermitServer } = await loadModule();
    const result = await submitUsdcPermitServer({
      chainId: base.id,
      token: contracts.USDCBase,
      owner: "0x" + "3".repeat(40),
      spender: contracts.CobuildSwap,
      value: "1",
      deadline: "1",
      signature: "0xsig",
    });

    const args = publicClient.simulateContract.mock.calls[0]?.[0]?.args;
    expect(args?.[4]).toBe("0xsig");
    expect(result).toEqual({
      success: true,
      txHash: "0xtxhash",
      explorerUrl: "https://explorer/0xtxhash",
    });
  });

  it("formats BaseError messages", async () => {
    const baseError = new BaseError("boom");
    baseError.shortMessage = "short";
    baseError.details = "details";
    const writeContract = vi.fn();
    createWalletClient.mockReturnValueOnce({ writeContract });
    const publicClient = {
      simulateContract: vi.fn().mockRejectedValue(baseError),
      getTransactionCount: vi.fn().mockResolvedValue(1),
    };
    getClient.mockReturnValueOnce(publicClient);

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { submitUsdcPermitServer } = await loadModule();
    const result = await submitUsdcPermitServer({
      chainId: base.id,
      token: contracts.USDCBase,
      owner: "0x" + "3".repeat(40),
      spender: contracts.CobuildSwap,
      value: "1",
      deadline: "1",
      signature: "0xsig",
    });

    expect(result).toEqual({ error: "short details" });
    consoleSpy.mockRestore();
  });

  it("returns errors when no hash is produced", async () => {
    const writeContract = vi.fn().mockResolvedValue(undefined);
    createWalletClient.mockReturnValueOnce({ writeContract });
    const publicClient = {
      simulateContract: vi.fn().mockResolvedValue({ request: { to: "0xcontract" } }),
      getTransactionCount: vi.fn().mockResolvedValue(1),
    };
    getClient.mockReturnValueOnce(publicClient);

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { submitUsdcPermitServer } = await loadModule();
    const result = await submitUsdcPermitServer({
      chainId: base.id,
      token: contracts.USDCBase,
      owner: "0x" + "3".repeat(40),
      spender: contracts.CobuildSwap,
      value: "1",
      deadline: "1",
      signature: "0xsig",
    });

    expect(result).toEqual({
      error: "Failed to submit USDC permit transaction after retries",
    });
    consoleSpy.mockRestore();
  });

  it("extracts message from non-error objects", async () => {
    const writeContract = vi.fn();
    createWalletClient.mockReturnValueOnce({ writeContract });
    const publicClient = {
      simulateContract: vi.fn().mockRejectedValue({ message: "custom" }),
      getTransactionCount: vi.fn().mockResolvedValue(1),
    };
    getClient.mockReturnValueOnce(publicClient);

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { submitUsdcPermitServer } = await loadModule();
    const result = await submitUsdcPermitServer({
      chainId: base.id,
      token: contracts.USDCBase,
      owner: "0x" + "3".repeat(40),
      spender: contracts.CobuildSwap,
      value: "1",
      deadline: "1",
      signature: "0xsig",
    });

    expect(result).toEqual({ error: "custom" });
    consoleSpy.mockRestore();
  });

  it("falls back when suggested nonce parsing fails", async () => {
    const parseSpy = vi.spyOn(Number, "parseInt").mockImplementation(() => {
      throw new Error("parse failed");
    });
    const writeContract = vi
      .fn()
      .mockRejectedValueOnce(new Error("nonce too low; next nonce 7"))
      .mockResolvedValueOnce("0xtxhash");
    createWalletClient.mockReturnValueOnce({ writeContract });
    const publicClient = {
      simulateContract: vi.fn().mockResolvedValue({ request: { to: "0xcontract" } }),
      getTransactionCount: vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2),
    };
    getClient.mockReturnValueOnce(publicClient);

    const { submitUsdcPermitServer } = await loadModule();
    const result = await submitUsdcPermitServer({
      chainId: base.id,
      token: contracts.USDCBase,
      owner: "0x" + "3".repeat(40),
      spender: contracts.CobuildSwap,
      value: "1",
      deadline: "1",
      signature: "0xsig",
    });

    expect(publicClient.getTransactionCount).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      success: true,
      txHash: "0xtxhash",
      explorerUrl: "https://explorer/0xtxhash",
    });
    parseSpy.mockRestore();
  });

  it("fails after max nonce retries", async () => {
    const writeContract = vi.fn().mockRejectedValue(new Error("nonce too low"));
    createWalletClient.mockReturnValueOnce({ writeContract });
    const publicClient = {
      simulateContract: vi.fn().mockResolvedValue({ request: { to: "0xcontract" } }),
      getTransactionCount: vi.fn().mockResolvedValue(1),
    };
    getClient.mockReturnValueOnce(publicClient);

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { submitUsdcPermitServer } = await loadModule();
    const result = await submitUsdcPermitServer({
      chainId: base.id,
      token: contracts.USDCBase,
      owner: "0x" + "3".repeat(40),
      spender: contracts.CobuildSwap,
      value: "1",
      deadline: "1",
      signature: "0xsig",
    });

    expect(writeContract).toHaveBeenCalledTimes(5);
    expect(result).toEqual({ error: "nonce too low" });
    consoleSpy.mockRestore();
  });

  it("returns errors from submit failures", async () => {
    const writeContract = vi.fn().mockRejectedValue(new Error("boom"));
    createWalletClient.mockReturnValueOnce({ writeContract });
    const publicClient = {
      simulateContract: vi.fn().mockResolvedValue({ request: { to: "0xcontract" } }),
      getTransactionCount: vi.fn().mockResolvedValue(1),
    };
    getClient.mockReturnValueOnce(publicClient);

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const { submitUsdcPermitServer } = await loadModule();
    const result = await submitUsdcPermitServer({
      chainId: base.id,
      token: contracts.USDCBase,
      owner: "0x" + "3".repeat(40),
      spender: contracts.CobuildSwap,
      value: "1",
      deadline: "1",
      signature: "0xsig",
    });

    expect(result).toEqual({ error: "boom" });
    consoleSpy.mockRestore();
  });
});
