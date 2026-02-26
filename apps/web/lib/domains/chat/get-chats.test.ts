import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./server-api", () => ({
  fetchChatApi: vi.fn(),
}));

import { fetchGoalChats } from "./get-chats";
import { fetchChatApi } from "./server-api";
import type { ChatListItem } from "./types";

afterEach(() => {
  vi.clearAllMocks();
});

describe("fetchGoalChats", () => {
  it("returns empty when identity token is missing", async () => {
    await expect(fetchGoalChats({ goalAddress: "goal-1" })).resolves.toEqual([]);
    expect(fetchChatApi).not.toHaveBeenCalled();
  });

  it("returns chats when the response is ok and encodes goal address", async () => {
    const chats: ChatListItem[] = [
      {
        id: "c1",
        title: "Hi",
        updatedAt: "2024-01-01T00:00:00.000Z",
        createdAt: "2024-01-01T00:00:00.000Z",
        type: "chat-default",
      },
    ];
    vi.mocked(fetchChatApi).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ chats }),
    } as unknown as Response);

    await expect(
      fetchGoalChats({
        goalAddress: "goal/1?with=spaces and symbols",
        identityToken: "token",
      })
    ).resolves.toEqual(chats);

    expect(fetchChatApi).toHaveBeenCalledWith(
      "/api/chats?goalAddress=goal%2F1%3Fwith%3Dspaces%20and%20symbols",
      { identityToken: "token" }
    );
  });

  it("returns empty when response is ok but missing chats", async () => {
    vi.mocked(fetchChatApi).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({}),
    } as unknown as Response);

    await expect(
      fetchGoalChats({ goalAddress: "goal-2", identityToken: "token" })
    ).resolves.toEqual([]);
  });

  it("returns empty when response is not ok and skips json parsing", async () => {
    const json = vi.fn().mockResolvedValue({
      chats: [{ id: "c1", title: "ignored", updatedAt: "", createdAt: "", type: "chat-default" }],
    });
    vi.mocked(fetchChatApi).mockResolvedValue({
      ok: false,
      json,
    } as unknown as Response);

    await expect(
      fetchGoalChats({ goalAddress: "goal-3", identityToken: "token" })
    ).resolves.toEqual([]);
    expect(json).not.toHaveBeenCalled();
  });

  it("returns empty when response json parsing throws", async () => {
    vi.mocked(fetchChatApi).mockResolvedValue({
      ok: true,
      json: vi.fn().mockRejectedValue(new Error("invalid json")),
    } as unknown as Response);

    await expect(
      fetchGoalChats({ goalAddress: "goal-4", identityToken: "token" })
    ).resolves.toEqual([]);
  });

  it("returns empty when fetchChatApi throws", async () => {
    vi.mocked(fetchChatApi).mockRejectedValue(new Error("network down"));

    await expect(
      fetchGoalChats({ goalAddress: "goal-5", identityToken: "token" })
    ).resolves.toEqual([]);
  });
});
