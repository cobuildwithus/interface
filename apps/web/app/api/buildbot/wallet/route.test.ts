import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { requireBuildBotBearerAuthMock, getOrCreateBuildBotAgentWalletMock } = vi.hoisted(() => ({
  requireBuildBotBearerAuthMock: vi.fn(),
  getOrCreateBuildBotAgentWalletMock: vi.fn(),
}));

vi.mock("@/lib/server/build-bot/auth", () => ({
  requireBuildBotBearerAuth: (...args: unknown[]) => requireBuildBotBearerAuthMock(...args),
}));

vi.mock("@/lib/server/build-bot/wallet-store", () => ({
  getOrCreateBuildBotAgentWallet: (...args: unknown[]) =>
    getOrCreateBuildBotAgentWalletMock(...args),
}));

import {
  BuildBotAuthError,
  BuildBotConfigError,
  BuildBotPolicyError,
} from "@/lib/server/build-bot/errors";
import { POST } from "./route";

const MISSING_CDP_CREDENTIALS_ERROR =
  "Build Bot wallet backend is not configured. Missing CDP credentials on the interface server.";
const MISSING_BUILD_BOT_TABLES_ERROR =
  "Build Bot database tables are missing. Run the build-bot SQL migrations before running setup.";

describe("build-bot wallet route", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns wallet", async () => {
    requireBuildBotBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });
    getOrCreateBuildBotAgentWalletMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      agentKey: "default",
      address: "0x0000000000000000000000000000000000000002",
      defaultNetwork: "base-sepolia",
    });

    const request = new Request("http://localhost/api/buildbot/wallet", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ defaultNetwork: "base-sepolia" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      ok: true,
      wallet: {
        ownerAddress: "0x0000000000000000000000000000000000000001",
        agentKey: "default",
        address: "0x0000000000000000000000000000000000000002",
        defaultNetwork: "base-sepolia",
      },
    });
  });

  it("uses agent key from auth and ignores request-body agentKey", async () => {
    requireBuildBotBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "agent-auth",
    });
    getOrCreateBuildBotAgentWalletMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      agentKey: "agent-auth",
      address: "0x0000000000000000000000000000000000000002",
      defaultNetwork: "base-sepolia",
    });

    const request = new Request("http://localhost/api/buildbot/wallet", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        defaultNetwork: "base-sepolia",
        agentKey: "attempted-override",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(getOrCreateBuildBotAgentWalletMock).toHaveBeenCalledWith({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      agentKey: "agent-auth",
      defaultNetwork: "base-sepolia",
    });
    expect(await response.json()).toEqual({
      ok: true,
      wallet: {
        ownerAddress: "0x0000000000000000000000000000000000000001",
        agentKey: "agent-auth",
        address: "0x0000000000000000000000000000000000000002",
        defaultNetwork: "base-sepolia",
      },
    });
  });

  it("returns 401 on auth errors", async () => {
    requireBuildBotBearerAuthMock.mockRejectedValue(new BuildBotAuthError(401, "Unauthorized"));

    const request = new Request("http://localhost/api/buildbot/wallet", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ ok: false, error: "Unauthorized" });
  });

  it("returns 400 when body is malformed json", async () => {
    requireBuildBotBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });

    const request = new Request("http://localhost/api/buildbot/wallet", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{",
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ ok: false, error: "Invalid JSON body" });
    expect(getOrCreateBuildBotAgentWalletMock).not.toHaveBeenCalled();
  });

  it("returns 503 when build-bot config is missing", async () => {
    requireBuildBotBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });
    getOrCreateBuildBotAgentWalletMock.mockRejectedValue(
      new BuildBotConfigError(MISSING_CDP_CREDENTIALS_ERROR)
    );

    const request = new Request("http://localhost/api/buildbot/wallet", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ defaultNetwork: "base-sepolia" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      ok: false,
      error: MISSING_CDP_CREDENTIALS_ERROR,
    });
  });

  it("returns 403 when setup is denied by policy", async () => {
    requireBuildBotBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });
    getOrCreateBuildBotAgentWalletMock.mockRejectedValue(new BuildBotPolicyError("blocked"));

    const request = new Request("http://localhost/api/buildbot/wallet", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ defaultNetwork: "base-sepolia" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      ok: false,
      error: "blocked",
    });
  });

  it("returns migration guidance when wallet table is missing", async () => {
    requireBuildBotBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });
    getOrCreateBuildBotAgentWalletMock.mockRejectedValue({
      code: "P2021",
      meta: { table: "cobuild.build_bot_agent_wallets" },
    });

    const request = new Request("http://localhost/api/buildbot/wallet", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ defaultNetwork: "base-sepolia" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(500);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      ok: false,
      error: MISSING_BUILD_BOT_TABLES_ERROR,
    });
  });

  it("returns migration guidance when auth token table is missing", async () => {
    requireBuildBotBearerAuthMock.mockRejectedValue({
      code: "P2021",
      meta: { table: "cobuild.build_bot_cli_tokens" },
    });

    const request = new Request("http://localhost/api/buildbot/wallet", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(500);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      ok: false,
      error: MISSING_BUILD_BOT_TABLES_ERROR,
    });
    expect(getOrCreateBuildBotAgentWalletMock).not.toHaveBeenCalled();
  });

  it("returns generic 500 when P2021 is for a different table", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      requireBuildBotBearerAuthMock.mockResolvedValue({
        ownerAddress: "0x0000000000000000000000000000000000000001",
        tokenId: "1",
        agentKey: "default",
      });
      getOrCreateBuildBotAgentWalletMock.mockRejectedValue({
        code: "P2021",
        meta: { table: "cobuild.some_other_table" },
      });

      const request = new Request("http://localhost/api/buildbot/wallet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ defaultNetwork: "base-sepolia" }),
      });

      const response = await POST(request);
      expect(response.status).toBe(500);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(await response.json()).toEqual({ ok: false, error: "Internal error" });
      expect(consoleErrorSpy).toHaveBeenCalledOnce();
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});
