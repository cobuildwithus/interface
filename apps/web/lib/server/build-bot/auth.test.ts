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

import { BuildBotAuthError } from "@/lib/server/build-bot/errors";
import {
  requireBuildBotSessionAddress,
  requireBuildBotBearerAuth,
} from "@/lib/server/build-bot/auth";

describe("build-bot auth", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns normalized session address", async () => {
    getSessionMock.mockResolvedValue({
      address: "0x000000000000000000000000000000000000dEaD",
    });

    const address = await requireBuildBotSessionAddress();
    expect(address).toBe("0x000000000000000000000000000000000000dead");
  });

  it("throws when session address is missing", async () => {
    getSessionMock.mockResolvedValue({});

    await expect(requireBuildBotSessionAddress()).rejects.toEqual(
      expect.objectContaining({
        status: 401,
        message: "Unauthorized",
      })
    );
  });

  it("throws when bearer token is missing", async () => {
    const request = new Request("http://localhost", { method: "POST" });

    await expect(requireBuildBotBearerAuth(request)).rejects.toEqual(
      expect.objectContaining({
        status: 401,
        message: "Unauthorized",
      })
    );
  });

  it("throws when bearer token is invalid", async () => {
    authenticateBuildBotCliTokenMock.mockResolvedValue(null);
    const request = new Request("http://localhost", {
      method: "POST",
      headers: { authorization: "Bearer bad-token" },
    });

    await expect(requireBuildBotBearerAuth(request)).rejects.toEqual(
      expect.objectContaining({
        status: 401,
        message: "Unauthorized",
      })
    );
  });

  it("returns auth context when token is valid", async () => {
    authenticateBuildBotCliTokenMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });

    const request = new Request("http://localhost", {
      method: "POST",
      headers: { authorization: "Bearer good-token" },
    });

    await expect(requireBuildBotBearerAuth(request)).resolves.toEqual({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });
  });

  it("uses BuildBotAuthError for auth failures", async () => {
    getSessionMock.mockResolvedValue({});

    await expect(requireBuildBotSessionAddress()).rejects.toBeInstanceOf(BuildBotAuthError);
  });
});
