import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { getSessionMock, importSpkiMock, jwtVerifyMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  importSpkiMock: vi.fn(),
  jwtVerifyMock: vi.fn(),
}));

const { queryRawMock } = vi.hoisted(() => ({
  queryRawMock: vi.fn(),
}));

vi.mock("@/lib/domains/auth/session", () => ({
  getSession: () => getSessionMock(),
}));

vi.mock("@/lib/server/db/cobuild-db-client", () => ({
  default: {
    $primary: () => ({
      $queryRaw: (...args: Parameters<typeof queryRawMock>) => queryRawMock(...args),
    }),
  },
  prismaPrimary: (client: { $primary?: () => unknown }) =>
    typeof client.$primary === "function" ? client.$primary() : client,
}));

vi.mock("jose", () => ({
  importSPKI: (...args: unknown[]) => importSpkiMock(...args),
  jwtVerify: (...args: unknown[]) => jwtVerifyMock(...args),
}));

import { CliAuthError } from "@/lib/server/cli/errors";
import { requireCliSessionAddress, requireCliBearerAuth } from "@/lib/server/cli/auth";

describe("cli auth", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns normalized session address", async () => {
    getSessionMock.mockResolvedValue({
      address: "0x000000000000000000000000000000000000dEaD",
    });

    const address = await requireCliSessionAddress();
    expect(address).toBe("0x000000000000000000000000000000000000dead");
  });

  it("throws when session address is missing", async () => {
    getSessionMock.mockResolvedValue({});

    await expect(requireCliSessionAddress()).rejects.toEqual(
      expect.objectContaining({
        status: 401,
        message: "Unauthorized",
      })
    );
  });

  it("throws when bearer token is missing", async () => {
    const request = new Request("http://localhost", { method: "POST" });

    await expect(requireCliBearerAuth(request)).rejects.toEqual(
      expect.objectContaining({
        status: 401,
        message: "Unauthorized",
      })
    );
  });

  it("throws when bearer token is invalid", async () => {
    importSpkiMock.mockResolvedValue({});
    jwtVerifyMock.mockRejectedValue(new Error("bad token"));

    const request = new Request("http://localhost", {
      method: "POST",
      headers: { authorization: "Bearer bad-token" },
    });

    await expect(requireCliBearerAuth(request)).rejects.toEqual(
      expect.objectContaining({
        status: 401,
        message: "Unauthorized",
      })
    );
  });

  it("returns auth context when token is valid", async () => {
    importSpkiMock.mockResolvedValue({});
    queryRawMock.mockResolvedValue([
      {
        id: 42n,
        scope: "tools:read tools:write wallet:read wallet:execute offline_access",
      },
    ]);
    jwtVerifyMock.mockResolvedValue({
      payload: {
        sub: "0x0000000000000000000000000000000000000001",
        sid: "42",
        agent_key: "default",
        scope: "tools:read tools:write wallet:read wallet:execute offline_access",
        iat: 1_700_000_000,
        exp: 1_700_000_600,
        iss: "cobuild-chat-api",
        aud: "cli",
      },
    });

    const request = new Request("http://localhost", {
      method: "POST",
      headers: { authorization: "Bearer good-token" },
    });

    await expect(requireCliBearerAuth(request)).resolves.toEqual({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      sessionId: "42",
      agentKey: "default",
      scope: "tools:read tools:write wallet:read wallet:execute offline_access",
      scopes: ["tools:read", "tools:write", "wallet:read", "wallet:execute", "offline_access"],
      hasToolsWrite: true,
      hasWalletExecute: true,
      hasAnyWriteScope: true,
    });
    expect(jwtVerifyMock).toHaveBeenCalledWith(
      "good-token",
      {},
      expect.objectContaining({
        algorithms: ["ES256"],
      })
    );
    expect(queryRawMock).toHaveBeenCalledTimes(1);
  });

  it("throws when write scope is required but token is read-only", async () => {
    importSpkiMock.mockResolvedValue({});
    queryRawMock.mockResolvedValue([
      {
        id: 7n,
        scope: "tools:read wallet:read offline_access",
      },
    ]);
    jwtVerifyMock.mockResolvedValue({
      payload: {
        sub: "0x0000000000000000000000000000000000000001",
        sid: "7",
        agent_key: "default",
        scope: "tools:read wallet:read offline_access",
        iat: 1_700_000_000,
        exp: 1_700_000_600,
        iss: "cobuild-chat-api",
        aud: "cli",
      },
    });

    const request = new Request("http://localhost", {
      method: "POST",
      headers: { authorization: "Bearer read-only-token" },
    });

    await expect(requireCliBearerAuth(request, { requireWalletExecute: true })).rejects.toEqual(
      expect.objectContaining({
        status: 403,
        message: "wallet:execute scope required",
      })
    );
  });

  it("throws when an explicit required scope is missing", async () => {
    importSpkiMock.mockResolvedValue({});
    queryRawMock.mockResolvedValue([
      {
        id: 7n,
        scope: "tools:read wallet:read offline_access",
      },
    ]);
    jwtVerifyMock.mockResolvedValue({
      payload: {
        sub: "0x0000000000000000000000000000000000000001",
        sid: "7",
        agent_key: "default",
        scope: "tools:read wallet:read offline_access",
        iat: 1_700_000_000,
        exp: 1_700_000_600,
        iss: "cobuild-chat-api",
        aud: "cli",
      },
    });

    const request = new Request("http://localhost", {
      method: "POST",
      headers: { authorization: "Bearer read-only-token" },
    });

    await expect(
      requireCliBearerAuth(request, { requiredScopes: ["wallet:execute"] })
    ).rejects.toEqual(
      expect.objectContaining({
        status: 403,
        message: "wallet:execute scope required",
      })
    );
  });

  it("uses CliAuthError for auth failures", async () => {
    getSessionMock.mockResolvedValue({});

    await expect(requireCliSessionAddress()).rejects.toBeInstanceOf(CliAuthError);
  });

  it("rejects tokens missing exp/iat verified claims", async () => {
    importSpkiMock.mockResolvedValue({});
    jwtVerifyMock.mockResolvedValue({
      payload: {
        sub: "0x0000000000000000000000000000000000000001",
        sid: "7",
        agent_key: "default",
        scope: "tools:read wallet:read offline_access",
        iss: "cobuild-chat-api",
        aud: "cli",
      },
    });

    const request = new Request("http://localhost", {
      method: "POST",
      headers: { authorization: "Bearer missing-exp-token" },
    });

    await expect(requireCliBearerAuth(request)).rejects.toEqual(
      expect.objectContaining({
        status: 401,
        message: "Unauthorized",
      })
    );
  });

  it("rejects revoked or expired sessions even when the JWT verifies", async () => {
    importSpkiMock.mockResolvedValue({});
    queryRawMock.mockResolvedValue([]);
    jwtVerifyMock.mockResolvedValue({
      payload: {
        sub: "0x0000000000000000000000000000000000000001",
        sid: "42",
        agent_key: "default",
        scope: "tools:read tools:write wallet:read wallet:execute offline_access",
        iat: 1_700_000_000,
        exp: 1_700_000_600,
        iss: "cobuild-chat-api",
        aud: "cli",
      },
    });

    const request = new Request("http://localhost", {
      method: "POST",
      headers: { authorization: "Bearer revoked-token" },
    });

    await expect(requireCliBearerAuth(request)).rejects.toEqual(
      expect.objectContaining({
        status: 401,
        message: "Unauthorized",
      })
    );
  });

  it("rejects sessions whose stored scope no longer matches the token", async () => {
    importSpkiMock.mockResolvedValue({});
    queryRawMock.mockResolvedValue([
      {
        id: 42n,
        scope: "tools:read offline_access",
      },
    ]);
    jwtVerifyMock.mockResolvedValue({
      payload: {
        sub: "0x0000000000000000000000000000000000000001",
        sid: "42",
        agent_key: "default",
        scope: "tools:read wallet:execute offline_access",
        iat: 1_700_000_000,
        exp: 1_700_000_600,
        iss: "cobuild-chat-api",
        aud: "cli",
      },
    });

    const request = new Request("http://localhost", {
      method: "POST",
      headers: { authorization: "Bearer scope-drift-token" },
    });

    await expect(requireCliBearerAuth(request)).rejects.toEqual(
      expect.objectContaining({
        status: 401,
        message: "Unauthorized",
      })
    );
  });

  it("rejects non-numeric session ids before hitting the DB", async () => {
    importSpkiMock.mockResolvedValue({});
    jwtVerifyMock.mockResolvedValue({
      payload: {
        sub: "0x0000000000000000000000000000000000000001",
        sid: "not-a-number",
        agent_key: "default",
        scope: "tools:read wallet:read offline_access",
        iat: 1_700_000_000,
        exp: 1_700_000_600,
        iss: "cobuild-chat-api",
        aud: "cli",
      },
    });

    const request = new Request("http://localhost", {
      method: "POST",
      headers: { authorization: "Bearer malformed-sid-token" },
    });

    await expect(requireCliBearerAuth(request)).rejects.toEqual(
      expect.objectContaining({
        status: 401,
        message: "Unauthorized",
      })
    );
    expect(queryRawMock).not.toHaveBeenCalled();
  });
});
