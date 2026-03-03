import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { getSessionMock, importSpkiMock, jwtVerifyMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  importSpkiMock: vi.fn(),
  jwtVerifyMock: vi.fn(),
}));

vi.mock("@/lib/domains/auth/session", () => ({
  getSession: () => getSessionMock(),
}));

vi.mock("jose", () => ({
  importSPKI: (...args: unknown[]) => importSpkiMock(...args),
  jwtVerify: (...args: unknown[]) => jwtVerifyMock(...args),
}));

import { requireCliBearerAuth } from "@/lib/server/cli/auth";

describe("cli auth write-scope audit", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("allows read-only scopes when write scope is not required", async () => {
    importSpkiMock.mockResolvedValue({});
    jwtVerifyMock.mockResolvedValue({
      payload: {
        sub: "0x0000000000000000000000000000000000000001",
        sid: "1",
        agent_key: "default",
        scope: "tools:read wallet:read offline_access",
        iat: 1_700_000_000,
        exp: 1_700_000_600,
        iss: "cobuild-chat-api",
        aud: "buildbot",
      },
    });

    const request = new Request("http://localhost", {
      method: "POST",
      headers: { authorization: "Bearer read-only-token" },
    });

    await expect(requireCliBearerAuth(request)).resolves.toEqual({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      sessionId: "1",
      agentKey: "default",
      scope: "tools:read wallet:read offline_access",
      scopes: ["tools:read", "wallet:read", "offline_access"],
      hasToolsWrite: false,
      hasWalletExecute: false,
      hasAnyWriteScope: false,
    });
  });
});
