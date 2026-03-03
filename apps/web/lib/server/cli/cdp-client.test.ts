import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { CdpClientMock } = vi.hoisted(() => ({
  CdpClientMock: vi.fn(),
}));

vi.mock("@coinbase/cdp-sdk", () => ({
  CdpClient: CdpClientMock,
}));

const ORIGINAL_ENV = { ...process.env };
const MISSING_CDP_CREDENTIALS_ERROR =
  "CLI wallet backend is not configured. Missing CDP credentials on the interface server.";

function clearCachedClient() {
  delete (globalThis as typeof globalThis & { cliCdpClient?: unknown }).cliCdpClient;
}

function setRequiredCdpEnv() {
  process.env.CDP_API_KEY_ID = "key-id";
  process.env.CDP_API_KEY_SECRET = "key-secret";
  process.env.CDP_WALLET_SECRET = "wallet-secret";
}

async function loadCdpClientModule() {
  return import("@/lib/server/cli/cdp-client");
}

async function loadCliErrorsModule() {
  return import("@/lib/server/cli/errors");
}

describe("cli cdp client", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = { ...ORIGINAL_ENV };
    clearCachedClient();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    clearCachedClient();
  });

  it("creates a client from required env vars", async () => {
    setRequiredCdpEnv();
    const clientInstance = { name: "mock-cdp-client" };
    CdpClientMock.mockImplementation(function mockCdpClientCtor() {
      return clientInstance;
    });

    const { getCliCdpClient } = await loadCdpClientModule();
    const client = getCliCdpClient();

    expect(client).toBe(clientInstance);
    expect(CdpClientMock).toHaveBeenCalledWith({
      apiKeyId: "key-id",
      apiKeySecret: "key-secret",
      walletSecret: "wallet-secret",
    });
  });

  it("reuses the cached global client instance", async () => {
    setRequiredCdpEnv();
    const clientInstance = { name: "singleton-client" };
    CdpClientMock.mockImplementation(function mockCdpClientCtor() {
      return clientInstance;
    });

    const { getCliCdpClient } = await loadCdpClientModule();
    const first = getCliCdpClient();
    const second = getCliCdpClient();

    expect(first).toBe(clientInstance);
    expect(second).toBe(clientInstance);
    expect(CdpClientMock).toHaveBeenCalledTimes(1);
  });

  it("reuses the cached global client across module reloads", async () => {
    setRequiredCdpEnv();
    const clientInstance = { name: "cross-module-singleton-client" };
    CdpClientMock.mockImplementation(function mockCdpClientCtor() {
      return clientInstance;
    });

    const firstModule = await loadCdpClientModule();
    const first = firstModule.getCliCdpClient();

    delete process.env.CDP_API_KEY_ID;
    delete process.env.CDP_API_KEY_SECRET;
    delete process.env.CDP_WALLET_SECRET;
    vi.resetModules();

    const secondModule = await loadCdpClientModule();
    const second = secondModule.getCliCdpClient();

    expect(first).toBe(clientInstance);
    expect(second).toBe(clientInstance);
    expect(CdpClientMock).toHaveBeenCalledTimes(1);
  });

  it.each(["CDP_API_KEY_ID", "CDP_API_KEY_SECRET", "CDP_WALLET_SECRET"] as const)(
    "throws when required env var %s is missing",
    async (missingEnvName) => {
      setRequiredCdpEnv();
      delete process.env[missingEnvName];

      const { getCliCdpClient } = await loadCdpClientModule();
      const { CliConfigError } = await loadCliErrorsModule();

      expect(() => getCliCdpClient()).toThrowError(CliConfigError);
      expect(() => getCliCdpClient()).toThrow(MISSING_CDP_CREDENTIALS_ERROR);
      expect(CdpClientMock).not.toHaveBeenCalled();
    }
  );
});
