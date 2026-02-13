import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const loadModule = async () => {
  vi.resetModules();
  return import("./server-api");
};

const env = process.env as Record<string, string | undefined>;
const originalEnv = {
  chatApiUrl: env.NEXT_PUBLIC_CHAT_API_URL,
  internalKey: env.CHAT_API_INTERNAL_KEY,
};

afterEach(() => {
  if (originalEnv.chatApiUrl === undefined) {
    delete env.NEXT_PUBLIC_CHAT_API_URL;
  } else {
    env.NEXT_PUBLIC_CHAT_API_URL = originalEnv.chatApiUrl;
  }
  if (originalEnv.internalKey === undefined) {
    delete env.CHAT_API_INTERNAL_KEY;
  } else {
    env.CHAT_API_INTERNAL_KEY = originalEnv.internalKey;
  }
  vi.unstubAllGlobals();
});

describe("fetchChatApi", () => {
  it("builds a chat api url, merges headers, and defaults cache", async () => {
    env.NEXT_PUBLIC_CHAT_API_URL = "https://chat.example.com";
    const { fetchChatApi } = await loadModule();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await fetchChatApi("/api/chats", {
      identityToken: "token-1",
      headers: { "x-extra": "value" },
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://chat.example.com/api/chats");
    const resolvedHeaders = new Headers(init?.headers);
    expect(resolvedHeaders.get("privy-id-token")).toBe("token-1");
    expect(resolvedHeaders.get("x-extra")).toBe("value");
    expect(init?.cache).toBe("no-store");
  });

  it("resolves non-slashed paths and preserves init cache overrides", async () => {
    env.NEXT_PUBLIC_CHAT_API_URL = "https://chat.example.com";
    const { fetchChatApi } = await loadModule();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await fetchChatApi("api/chat/123", { init: { cache: "force-cache" } });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://chat.example.com/api/chat/123");
    expect(init?.cache).toBe("force-cache");
  });

  it("keeps full urls and merges init headers before overrides", async () => {
    env.NEXT_PUBLIC_CHAT_API_URL = "https://chat.example.com";
    const { fetchChatApi } = await loadModule();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await fetchChatApi("https://override.example.com/api/chat/abc", {
      identityToken: "token-2",
      headers: { "x-extra": "override" },
      init: { headers: { "x-extra": "base", "x-init": "present" } },
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://override.example.com/api/chat/abc");
    const resolvedHeaders = new Headers(init?.headers);
    expect(resolvedHeaders.get("x-init")).toBe("present");
    expect(resolvedHeaders.get("x-extra")).toBe("override");
    expect(resolvedHeaders.get("privy-id-token")).toBe("token-2");
  });

  it("adds the internal key header when configured", async () => {
    env.NEXT_PUBLIC_CHAT_API_URL = "https://chat.example.com";
    env.CHAT_API_INTERNAL_KEY = "secret-1";
    const { fetchChatApi } = await loadModule();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await fetchChatApi("/api/chats");

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const resolvedHeaders = new Headers(init?.headers);
    expect(resolvedHeaders.get("x-chat-internal-key")).toBe("secret-1");
  });
});
