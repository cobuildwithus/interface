import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { requireCliBearerAuthMock, getOrCreateCliAgentWalletMock } = vi.hoisted(() => ({
  requireCliBearerAuthMock: vi.fn(),
  getOrCreateCliAgentWalletMock: vi.fn(),
}));

vi.mock("@/lib/server/cli/auth", () => ({
  requireCliBearerAuth: (...args: unknown[]) => requireCliBearerAuthMock(...args),
}));

vi.mock("@/lib/server/cli/wallet-store", () => ({
  getOrCreateCliAgentWallet: (...args: unknown[]) => getOrCreateCliAgentWalletMock(...args),
}));

import { CliAuthError, CliConfigError, CliPolicyError } from "@/lib/server/cli/errors";
import { POST } from "./route";

const MISSING_CDP_CREDENTIALS_ERROR =
  "CLI wallet backend is not configured. Missing CDP credentials on the interface server.";
const MISSING_CLI_TABLES_ERROR =
  "CLI database tables are missing. Run the cli SQL migrations before running setup.";

describe("cli wallet route", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns wallet", async () => {
    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });
    getOrCreateCliAgentWalletMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      agentKey: "default",
      address: "0x0000000000000000000000000000000000000002",
      defaultNetwork: "base",
    });

    const request = new Request("http://localhost/api/cli/wallet", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ defaultNetwork: "base-sepolia" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(requireCliBearerAuthMock).toHaveBeenCalledWith(request, {
      requiredScopes: ["wallet:execute"],
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      ok: true,
      wallet: {
        ownerAddress: "0x0000000000000000000000000000000000000001",
        agentKey: "default",
        address: "0x0000000000000000000000000000000000000002",
        defaultNetwork: "base",
      },
    });
  });

  it("rejects request-body agentKey when it does not match auth scope", async () => {
    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "agent-auth",
    });

    const request = new Request("http://localhost/api/cli/wallet", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        defaultNetwork: "base-sepolia",
        agentKey: "attempted-override",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: "agentKey does not match token scope",
    });
    expect(getOrCreateCliAgentWalletMock).not.toHaveBeenCalled();
  });

  it("returns 401 on auth errors", async () => {
    requireCliBearerAuthMock.mockRejectedValue(new CliAuthError(401, "Unauthorized"));

    const request = new Request("http://localhost/api/cli/wallet", {
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
    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });

    const request = new Request("http://localhost/api/cli/wallet", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{",
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ ok: false, error: "Invalid JSON body" });
    expect(getOrCreateCliAgentWalletMock).not.toHaveBeenCalled();
  });

  it("returns 503 when cli config is missing", async () => {
    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });
    getOrCreateCliAgentWalletMock.mockRejectedValue(
      new CliConfigError(MISSING_CDP_CREDENTIALS_ERROR)
    );

    const request = new Request("http://localhost/api/cli/wallet", {
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
    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });
    getOrCreateCliAgentWalletMock.mockRejectedValue(new CliPolicyError("blocked"));

    const request = new Request("http://localhost/api/cli/wallet", {
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
    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });
    getOrCreateCliAgentWalletMock.mockRejectedValue({
      code: "P2021",
      meta: { table: "cobuild.cli_agent_wallets" },
    });

    const request = new Request("http://localhost/api/cli/wallet", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ defaultNetwork: "base-sepolia" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(500);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      ok: false,
      error: MISSING_CLI_TABLES_ERROR,
    });
  });

  it("returns generic 500 when auth failure does not map to wallet tables", async () => {
    requireCliBearerAuthMock.mockRejectedValue({
      code: "P2021",
      meta: { table: "cobuild.cli_oauth_codes" },
    });

    const request = new Request("http://localhost/api/cli/wallet", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(500);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      ok: false,
      error: "Internal error",
    });
    expect(getOrCreateCliAgentWalletMock).not.toHaveBeenCalled();
  });

  it("returns generic 500 when P2021 is for a different table", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      requireCliBearerAuthMock.mockResolvedValue({
        ownerAddress: "0x0000000000000000000000000000000000000001",
        tokenId: "1",
        agentKey: "default",
      });
      getOrCreateCliAgentWalletMock.mockRejectedValue({
        code: "P2021",
        meta: { table: "cobuild.some_other_table" },
      });

      const request = new Request("http://localhost/api/cli/wallet", {
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
