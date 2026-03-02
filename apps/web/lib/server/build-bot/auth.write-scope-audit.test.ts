import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { getSessionMock, authenticateBuildBotCliTokenMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  authenticateBuildBotCliTokenMock: vi.fn(),
}));

vi.mock("@/lib/domains/auth/session", () => ({
  getSession: () => getSessionMock(),
}));

vi.mock("@/lib/server/build-bot/token-store", () => ({
  authenticateBuildBotCliToken: (...args: unknown[]) => authenticateBuildBotCliTokenMock(...args),
}));

import { requireBuildBotBearerAuth } from "@/lib/server/build-bot/auth";

describe("build-bot auth write-scope audit", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("allows read-only tokens when write scope is not required", async () => {
    authenticateBuildBotCliTokenMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
      canWrite: false,
    });

    const request = new Request("http://localhost", {
      method: "POST",
      headers: { authorization: "Bearer read-only-token" },
    });

    await expect(requireBuildBotBearerAuth(request)).resolves.toEqual({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
      canWrite: false,
    });
  });
});
