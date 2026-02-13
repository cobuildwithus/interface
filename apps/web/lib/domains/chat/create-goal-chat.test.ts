import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CHAT_TYPE } from "./constants";
import { createGoalChat, isAuthExpiredStatus } from "./create-goal-chat";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createGoalChat", () => {
  it("returns a failure outcome when the API responds with a non-ok status", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      text: () => Promise.resolve("Unauthorized"),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(createGoalChat({ goalAddress: "0xabc" })).resolves.toEqual({
      ok: false,
      status: 401,
      error: "Unauthorized",
    });
  });

  it("returns a failure outcome when the API responds with JSON error details", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      text: () => Promise.resolve(JSON.stringify({ error: "bad input" })),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(createGoalChat({ goalAddress: "0xabc" })).resolves.toEqual({
      ok: false,
      status: 400,
      error: "bad input",
    });
  });

  it("falls back to the status text when the API error response has no body", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Server Error",
      text: () => Promise.resolve(""),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(createGoalChat({ goalAddress: "0xabc" })).resolves.toEqual({
      ok: false,
      status: 500,
      error: "Server Error",
    });
  });

  it("falls back to status text when the response lacks a text reader", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 418,
      statusText: "I'm a teapot",
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(createGoalChat({ goalAddress: "0xabc" })).resolves.toEqual({
      ok: false,
      status: 418,
      error: "I'm a teapot",
    });
  });

  it("falls back to the status text when the API error body cannot be read", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      statusText: "Bad Gateway",
      text: () => Promise.reject(new Error("no body")),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(createGoalChat({ goalAddress: "0xabc" })).resolves.toEqual({
      ok: false,
      status: 502,
      error: "Bad Gateway",
    });
  });

  it("returns a failure outcome when the API response is missing a chat id", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ chatGrant: "grant" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(createGoalChat({ goalAddress: "0xabc" })).resolves.toEqual({
      ok: false,
      status: 200,
      error: "Chat API response missing a chat id.",
    });
  });

  it("returns a failure outcome when the API returns invalid JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.reject(new Error("bad json")),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(createGoalChat({ goalAddress: "0xabc" })).resolves.toEqual({
      ok: false,
      status: 200,
      error: "Chat API returned invalid JSON.",
    });
  });

  it("returns a failure outcome when the request throws", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(createGoalChat({ goalAddress: "0xabc" })).resolves.toEqual({
      ok: false,
      error: "network down",
    });
  });

  it("returns a CORS-friendly message when the request fails to fetch", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(createGoalChat({ goalAddress: "0xabc" })).resolves.toEqual({
      ok: false,
      error: "Network error. Check CORS or your connection.",
    });
  });

  it("creates a chat and returns the payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ chatId: "chat-1", chatGrant: "grant" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await createGoalChat({
      goalAddress: "0xabc",
      identityToken: "token",
      type: "custom",
      data: { intent: "join-team" },
    });

    expect(result).toEqual({
      ok: true,
      status: 200,
      data: { chatId: "chat-1", chatGrant: "grant" },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:4000/api/chat/new");
    expect(init?.headers).toMatchObject({
      "Content-Type": "application/json",
      "privy-id-token": "token",
    });
    expect(init?.body).toBe(
      JSON.stringify({
        type: "custom",
        data: { intent: "join-team", goalAddress: "0xabc" },
      })
    );
  });

  it("defaults to the chat-default type when none is provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ chatId: "chat-2" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await createGoalChat({ goalAddress: "0xdef" });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init?.body).toBe(
      JSON.stringify({ type: DEFAULT_CHAT_TYPE, data: { goalAddress: "0xdef" } })
    );
  });
});

describe("isAuthExpiredStatus", () => {
  it("returns true for 401 and 403", () => {
    expect(isAuthExpiredStatus(401)).toBe(true);
    expect(isAuthExpiredStatus(403)).toBe(true);
  });

  it("returns false for other values", () => {
    expect(isAuthExpiredStatus(400)).toBe(false);
    expect(isAuthExpiredStatus()).toBe(false);
  });
});
