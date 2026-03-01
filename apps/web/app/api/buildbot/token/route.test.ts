import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  requireBuildBotSessionAddressMock,
  listBuildBotCliTokensMock,
  createBuildBotCliTokenMock,
  revokeBuildBotCliTokenMock,
} = vi.hoisted(() => ({
  requireBuildBotSessionAddressMock: vi.fn(),
  listBuildBotCliTokensMock: vi.fn(),
  createBuildBotCliTokenMock: vi.fn(),
  revokeBuildBotCliTokenMock: vi.fn(),
}));

vi.mock("@/lib/server/build-bot/auth", () => ({
  requireBuildBotSessionAddress: () => requireBuildBotSessionAddressMock(),
}));

vi.mock("@/lib/server/build-bot/token-store", () => ({
  listBuildBotCliTokens: (...args: unknown[]) => listBuildBotCliTokensMock(...args),
  createBuildBotCliToken: (...args: unknown[]) => createBuildBotCliTokenMock(...args),
  revokeBuildBotCliToken: (...args: unknown[]) => revokeBuildBotCliTokenMock(...args),
}));

import { BuildBotAuthError } from "@/lib/server/build-bot/errors";
import { GET, POST, DELETE } from "./route";

const MISSING_BUILD_BOT_TABLES_ERROR =
  "Build Bot database tables are missing. Run the build-bot SQL migrations before running setup.";

describe("build-bot token route", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns tokens for session address", async () => {
    requireBuildBotSessionAddressMock.mockResolvedValue(
      "0x0000000000000000000000000000000000000001"
    );
    listBuildBotCliTokensMock.mockResolvedValue([
      {
        id: "1",
        agentKey: "default",
        label: "laptop",
        createdAt: "2026-02-24T00:00:00.000Z",
        lastUsedAt: null,
      },
    ]);

    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      ok: true,
      tokens: [
        {
          id: "1",
          agentKey: "default",
          label: "laptop",
          createdAt: "2026-02-24T00:00:00.000Z",
          lastUsedAt: null,
        },
      ],
    });
  });

  it("creates a token", async () => {
    requireBuildBotSessionAddressMock.mockResolvedValue(
      "0x0000000000000000000000000000000000000001"
    );
    createBuildBotCliTokenMock.mockResolvedValue({
      token: "bbt_example",
      tokenInfo: {
        id: "9",
        agentKey: "default",
        label: "cli",
        createdAt: "2026-02-24T00:00:00.000Z",
        lastUsedAt: null,
      },
    });

    const request = new Request("http://localhost/api/buildbot/token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ label: "cli", agentKey: "agent-default" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      ok: true,
      token: "bbt_example",
      tokenInfo: {
        id: "9",
        agentKey: "default",
        label: "cli",
        createdAt: "2026-02-24T00:00:00.000Z",
        lastUsedAt: null,
      },
    });
    expect(createBuildBotCliTokenMock).toHaveBeenCalledWith({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      label: "cli",
      agentKey: "agent-default",
    });
  });

  it("returns 400 when create token payload has invalid agent key", async () => {
    requireBuildBotSessionAddressMock.mockResolvedValue(
      "0x0000000000000000000000000000000000000001"
    );

    const request = new Request("http://localhost/api/buildbot/token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ label: "cli", agentKey: "../bad" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(createBuildBotCliTokenMock).not.toHaveBeenCalled();
  });

  it("returns 400 for malformed json on token creation", async () => {
    requireBuildBotSessionAddressMock.mockResolvedValue(
      "0x0000000000000000000000000000000000000001"
    );

    const request = new Request("http://localhost/api/buildbot/token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{",
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: "Invalid JSON body" });
    expect(createBuildBotCliTokenMock).not.toHaveBeenCalled();
  });

  it("revokes a token", async () => {
    requireBuildBotSessionAddressMock.mockResolvedValue(
      "0x0000000000000000000000000000000000000001"
    );
    revokeBuildBotCliTokenMock.mockResolvedValue(true);

    const request = new Request("http://localhost/api/buildbot/token", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tokenId: "1" }),
    });

    const response = await DELETE(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ ok: true, revoked: true });
  });

  it("returns 400 for malformed json on token revocation", async () => {
    requireBuildBotSessionAddressMock.mockResolvedValue(
      "0x0000000000000000000000000000000000000001"
    );

    const request = new Request("http://localhost/api/buildbot/token", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: "{",
    });

    const response = await DELETE(request);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: "Invalid JSON body" });
    expect(revokeBuildBotCliTokenMock).not.toHaveBeenCalled();
  });

  it("returns 401 when unauthenticated", async () => {
    requireBuildBotSessionAddressMock.mockRejectedValue(new BuildBotAuthError(401, "Unauthorized"));

    const response = await GET();
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ ok: false, error: "Unauthorized" });
  });

  it("returns migration guidance when token table is missing", async () => {
    requireBuildBotSessionAddressMock.mockResolvedValue(
      "0x0000000000000000000000000000000000000001"
    );
    listBuildBotCliTokensMock.mockRejectedValue({
      code: "P2021",
      meta: { table: "cobuild.build_bot_cli_tokens" },
    });

    const response = await GET();
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      ok: false,
      error: MISSING_BUILD_BOT_TABLES_ERROR,
    });
  });

  it("rejects cross-origin token creation", async () => {
    const request = new Request("http://localhost/api/buildbot/token", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://evil.example",
      },
      body: JSON.stringify({ label: "cli" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ ok: false, error: "Forbidden" });
  });

  it("rejects cross-origin token revocation by origin header", async () => {
    const request = new Request("http://localhost/api/buildbot/token", {
      method: "DELETE",
      headers: {
        "content-type": "application/json",
        origin: "https://evil.example",
      },
      body: JSON.stringify({ tokenId: "1" }),
    });

    const response = await DELETE(request);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ ok: false, error: "Forbidden" });
    expect(requireBuildBotSessionAddressMock).not.toHaveBeenCalled();
    expect(revokeBuildBotCliTokenMock).not.toHaveBeenCalled();
  });

  it("rejects cross-origin token revocation by mismatched referer", async () => {
    const request = new Request("http://localhost/api/buildbot/token", {
      method: "DELETE",
      headers: {
        "content-type": "application/json",
        referer: "https://evil.example/tokens",
      },
      body: JSON.stringify({ tokenId: "1" }),
    });

    const response = await DELETE(request);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ ok: false, error: "Forbidden" });
    expect(requireBuildBotSessionAddressMock).not.toHaveBeenCalled();
    expect(revokeBuildBotCliTokenMock).not.toHaveBeenCalled();
  });

  it("rejects referers that only share an origin prefix", async () => {
    const request = new Request("http://localhost/api/buildbot/token", {
      method: "DELETE",
      headers: {
        "content-type": "application/json",
        referer: "http://localhost.evil.example/tokens",
      },
      body: JSON.stringify({ tokenId: "1" }),
    });

    const response = await DELETE(request);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ ok: false, error: "Forbidden" });
    expect(requireBuildBotSessionAddressMock).not.toHaveBeenCalled();
    expect(revokeBuildBotCliTokenMock).not.toHaveBeenCalled();
  });

  it("rejects cross-origin token revocation by sec-fetch-site", async () => {
    const request = new Request("http://localhost/api/buildbot/token", {
      method: "DELETE",
      headers: {
        "content-type": "application/json",
        "sec-fetch-site": "cross-site",
      },
      body: JSON.stringify({ tokenId: "1" }),
    });

    const response = await DELETE(request);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ ok: false, error: "Forbidden" });
    expect(requireBuildBotSessionAddressMock).not.toHaveBeenCalled();
    expect(revokeBuildBotCliTokenMock).not.toHaveBeenCalled();
  });
});
