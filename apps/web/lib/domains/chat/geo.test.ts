import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const CHAT_GEO_STORAGE_KEY = "cobuild:chat-geo";

const createSessionStorage = (): Storage => {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
  };
};

type WindowStub = { sessionStorage: Storage };

const stubSessionStorage = (sessionStorage: ReturnType<typeof createSessionStorage>) => {
  const windowStub: WindowStub = { sessionStorage };
  vi.stubGlobal("window", windowStub);
  vi.stubGlobal("sessionStorage", sessionStorage);
};

const loadModule = async () => await import("./geo");

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("chat geo helpers", () => {
  it("returns null when window is unavailable", async () => {
    const { primeChatGeo, getChatGeoHeaders } = await loadModule();
    vi.stubGlobal("window", undefined);

    expect(await primeChatGeo()).toBeNull();
    expect(getChatGeoHeaders()).toEqual({});
  });

  it("builds headers from cached geo data", async () => {
    const sessionStorage = createSessionStorage();
    sessionStorage.setItem(
      CHAT_GEO_STORAGE_KEY,
      JSON.stringify({ country: " US ", countryRegion: " CA " })
    );
    stubSessionStorage(sessionStorage);

    const { getChatGeoHeaders } = await loadModule();

    expect(getChatGeoHeaders()).toEqual({
      country: "US",
      "country-region": "CA",
    });
  });

  it("ignores invalid cached geo payloads", async () => {
    const sessionStorage = createSessionStorage();
    sessionStorage.setItem(CHAT_GEO_STORAGE_KEY, "{");
    stubSessionStorage(sessionStorage);

    const { getChatGeoHeaders } = await loadModule();

    expect(getChatGeoHeaders()).toEqual({});
  });

  it("fetches and stores geo when cache is empty", async () => {
    const sessionStorage = createSessionStorage();
    stubSessionStorage(sessionStorage);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ country: "US", countryRegion: "CA" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { primeChatGeo } = await loadModule();

    const geo = await primeChatGeo();
    expect(geo).toEqual({ country: "US", countryRegion: "CA" });
    expect(sessionStorage.getItem(CHAT_GEO_STORAGE_KEY)).toBe(
      JSON.stringify({ country: "US", countryRegion: "CA" })
    );
  });

  it("returns null when the geo response is empty", async () => {
    const sessionStorage = createSessionStorage();
    stubSessionStorage(sessionStorage);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ country: " ", countryRegion: "" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { primeChatGeo } = await loadModule();

    const geo = await primeChatGeo();
    expect(geo).toBeNull();
    expect(sessionStorage.getItem(CHAT_GEO_STORAGE_KEY)).toBeNull();
  });

  it("coalesces concurrent fetches", async () => {
    const sessionStorage = createSessionStorage();
    stubSessionStorage(sessionStorage);

    let resolvePayload!: (payload: { country: string }) => void;
    const payloadPromise = new Promise<{ country: string }>((resolve) => {
      resolvePayload = resolve;
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockReturnValue(payloadPromise),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { primeChatGeo } = await loadModule();

    const first = primeChatGeo();
    const second = primeChatGeo();

    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolvePayload({ country: "US" });
    await expect(first).resolves.toEqual({ country: "US", countryRegion: null });
    await expect(second).resolves.toEqual({ country: "US", countryRegion: null });
  });

  it("returns null when the geo request fails", async () => {
    const sessionStorage = createSessionStorage();
    stubSessionStorage(sessionStorage);

    const fetchMock = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal("fetch", fetchMock);

    const { primeChatGeo } = await loadModule();

    await expect(primeChatGeo()).resolves.toBeNull();
  });
});
