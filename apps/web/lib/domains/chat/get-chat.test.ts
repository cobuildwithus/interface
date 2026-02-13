import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { fetchGoalChat } from "./get-chat";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchGoalChat", () => {
  it("returns ok payload with grant", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ messages: [{ id: "m1", role: "user" }] }),
      headers: { get: () => "grant-1" },
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchGoalChat({ chatId: "chat-1", identityToken: "token" });

    expect(result).toEqual({
      ok: true,
      status: 200,
      payload: { messages: [{ id: "m1", role: "user" }] },
      grant: "grant-1",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:4000/api/chat/chat-1");
    const resolvedHeaders = new Headers(init?.headers);
    expect(resolvedHeaders.get("privy-id-token")).toBe("token");
    expect(init?.cache).toBe("no-store");
  });

  it("returns notFound when the chat is missing", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      text: () => Promise.resolve(""),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchGoalChat({ chatId: "missing", identityToken: "token" })).resolves.toEqual({
      ok: false,
      status: 404,
      error: "Not Found",
      notFound: true,
    });
  });

  it("parses an error message from JSON error responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      text: () => Promise.resolve(JSON.stringify({ error: "token expired" })),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchGoalChat({ chatId: "chat-err", identityToken: "token" })).resolves.toEqual({
      ok: false,
      status: 401,
      error: "token expired",
      notFound: false,
    });
  });

  it("parses an error message from JSON message responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      text: () => Promise.resolve(JSON.stringify({ message: "bad input" })),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchGoalChat({ chatId: "chat-msg", identityToken: "token" })).resolves.toEqual({
      ok: false,
      status: 400,
      error: "bad input",
      notFound: false,
    });
  });

  it("falls back to status text when the response has no text reader", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchGoalChat({ chatId: "chat-err2", identityToken: "token" })).resolves.toEqual({
      ok: false,
      status: 503,
      error: "Service Unavailable",
      notFound: false,
    });
  });

  it("returns invalid JSON error when the response is not JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.reject(new Error("bad json")),
      headers: { get: () => null },
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchGoalChat({ chatId: "chat-2", identityToken: "token" })).resolves.toEqual({
      ok: false,
      status: 200,
      error: "Chat API returned invalid JSON.",
    });
  });

  it("returns invalid JSON error when the payload is empty", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(null),
      headers: { get: () => null },
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchGoalChat({ chatId: "chat-empty", identityToken: "token" })).resolves.toEqual({
      ok: false,
      status: 200,
      error: "Chat API returned invalid JSON.",
    });
  });

  it("returns a fetch error when the request throws", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchGoalChat({ chatId: "chat-3", identityToken: "token" })).resolves.toEqual({
      ok: false,
      error: "network down",
    });
  });

  it("returns a network error message when fetch fails", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchGoalChat({ chatId: "chat-4", identityToken: "token" })).resolves.toEqual({
      ok: false,
      error: "Network error. Check CORS or your connection.",
    });
  });

  it("returns a fallback error when the thrown value is not an Error", async () => {
    const fetchMock = vi.fn().mockRejectedValue({});
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchGoalChat({ chatId: "chat-5", identityToken: "token" })).resolves.toEqual({
      ok: false,
      error: "Unexpected error. Please try again.",
    });
  });
});
