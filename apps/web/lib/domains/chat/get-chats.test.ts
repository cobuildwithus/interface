import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { fetchGoalChats } from "./get-chats";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchGoalChats", () => {
  it("returns empty when identity token is missing", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchGoalChats({ goalAddress: "goal-1" })).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns chats when the response is ok", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          chats: [
            {
              id: "c1",
              title: "Hi",
              updatedAt: "2024-01-01T00:00:00.000Z",
              createdAt: "2024-01-01T00:00:00.000Z",
              type: "chat-default",
            },
          ],
        }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchGoalChats({ goalAddress: "goal-1", identityToken: "token" })
    ).resolves.toEqual([
      {
        id: "c1",
        title: "Hi",
        updatedAt: "2024-01-01T00:00:00.000Z",
        createdAt: "2024-01-01T00:00:00.000Z",
        type: "chat-default",
      },
    ]);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:4000/api/chats?goalAddress=goal-1");
    const resolvedHeaders = new Headers(init?.headers);
    expect(resolvedHeaders.get("privy-id-token")).toBe("token");
    expect(init?.cache).toBe("no-store");
  });

  it("returns empty when response is ok but missing chats", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchGoalChats({ goalAddress: "goal-2", identityToken: "token" })
    ).resolves.toEqual([]);
  });

  it("returns empty when response is not ok", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: "Forbidden",
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchGoalChats({ goalAddress: "goal-3", identityToken: "token" })
    ).resolves.toEqual([]);
  });

  it("returns empty when fetch throws", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchGoalChats({ goalAddress: "goal-4", identityToken: "token" })
    ).resolves.toEqual([]);
  });
});
