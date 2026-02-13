import { afterEach, describe, expect, it, vi } from "vitest";
import { getChatGrantStorageKey, readChatGrant, writeChatGrant } from "./grant";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("chat grant helpers", () => {
  const buildSessionStorage = (): Storage => {
    const store = new Map<string, string>();
    return {
      get length() {
        return store.size;
      },
      clear: () => store.clear(),
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    };
  };

  type WindowStub = { sessionStorage: Storage };

  const stubWindowWithSessionStorage = (sessionStorage: Storage) => {
    const windowStub: WindowStub = { sessionStorage };
    vi.stubGlobal("window", windowStub);
  };

  it("returns null when window is unavailable", () => {
    vi.stubGlobal("window", undefined);
    expect(readChatGrant("chat-1")).toBeNull();
  });

  it("reads and writes grants from sessionStorage", () => {
    const sessionStorage = buildSessionStorage();
    stubWindowWithSessionStorage(sessionStorage);

    const key = getChatGrantStorageKey("chat-1");
    expect(readChatGrant("chat-1")).toBeNull();
    writeChatGrant("chat-1", "grant");
    expect(sessionStorage.getItem(key)).toBe("grant");
    expect(readChatGrant("chat-1")).toBe("grant");
  });

  it("returns null when sessionStorage throws on read", () => {
    const sessionStorage = {
      getItem: () => {
        throw new Error("nope");
      },
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    } satisfies Storage;
    stubWindowWithSessionStorage(sessionStorage);

    expect(readChatGrant("chat-1")).toBeNull();
  });

  it("does not throw when sessionStorage fails on write", () => {
    const sessionStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("nope");
      },
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    } satisfies Storage;
    stubWindowWithSessionStorage(sessionStorage);

    expect(() => writeChatGrant("chat-1", "grant")).not.toThrow();
  });
});
