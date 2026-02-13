import { afterEach, describe, expect, it, vi } from "vitest";
import type { FileUIPart } from "ai";
import {
  consumeGoalChatCreateConfig,
  consumeGoalChatCreateIntent,
  consumeGoalChatMessageIntent,
  setGoalChatCreateConfig,
  setGoalChatCreateIntent,
  setGoalChatMessageIntent,
} from "./goal-intents";

const sampleMessage = {
  text: "hello",
  files: [
    {
      type: "file",
      url: "https://example.com/a.png",
      mediaType: "image/png",
    } as FileUIPart,
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("goal chat intent storage", () => {
  const createSessionStorage = (): Storage & { store: Map<string, string> } => {
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
      store,
    };
  };

  it("returns empty values when window is unavailable", () => {
    vi.stubGlobal("window", undefined);

    expect(consumeGoalChatCreateIntent("0xabc")).toBe(false);
    expect(consumeGoalChatMessageIntent("0xabc")).toBeNull();
  });

  it("stores and consumes create intents", () => {
    const sessionStorage = createSessionStorage();
    vi.stubGlobal("window", { sessionStorage });
    vi.stubGlobal("sessionStorage", sessionStorage);

    setGoalChatCreateIntent("0xabc");
    expect(sessionStorage.store.get("goal-chat-create-intent:0xabc")).toBe("1");
    expect(consumeGoalChatCreateIntent("0xabc")).toBe(true);
    expect(sessionStorage.store.has("goal-chat-create-intent:0xabc")).toBe(false);
    expect(consumeGoalChatCreateIntent("0xabc")).toBe(false);
  });

  it("stores and consumes create configs", () => {
    const sessionStorage = createSessionStorage();
    vi.stubGlobal("window", { sessionStorage });
    vi.stubGlobal("sessionStorage", sessionStorage);

    setGoalChatCreateConfig("0xabc", {
      data: { intent: "join-team" },
      message: { text: "Hello", files: [] },
    });

    const stored = sessionStorage.store.get("goal-chat-create-config:0xabc");
    expect(stored).toContain("join-team");

    expect(consumeGoalChatCreateConfig("0xabc")).toEqual({
      data: { intent: "join-team" },
      message: { text: "Hello", files: [] },
    });
    expect(sessionStorage.store.has("goal-chat-create-config:0xabc")).toBe(false);
    expect(consumeGoalChatCreateConfig("0xabc")).toBeNull();
  });

  it("clears create config when no fields are provided", () => {
    const sessionStorage = createSessionStorage();
    // @ts-expect-error minimal window stub for sessionStorage access
    vi.stubGlobal("window", { sessionStorage } as Window);
    vi.stubGlobal("sessionStorage", sessionStorage);

    setGoalChatCreateConfig("0xabc", { data: { intent: "join-team" } });
    expect(sessionStorage.store.has("goal-chat-create-config:0xabc")).toBe(true);

    setGoalChatCreateConfig("0xabc", { message: { text: " ", files: [] } });
    expect(sessionStorage.store.has("goal-chat-create-config:0xabc")).toBe(false);
  });

  it("returns null when stored create config is invalid json", () => {
    const sessionStorage = createSessionStorage();
    // @ts-expect-error minimal window stub for sessionStorage access
    vi.stubGlobal("window", { sessionStorage } as Window);
    vi.stubGlobal("sessionStorage", sessionStorage);

    sessionStorage.setItem("goal-chat-create-config:0xabc", "{invalid");
    expect(consumeGoalChatCreateConfig("0xabc")).toBeNull();
    expect(sessionStorage.store.has("goal-chat-create-config:0xabc")).toBe(true);
  });

  it("stores and consumes message intents", () => {
    const sessionStorage = createSessionStorage();
    vi.stubGlobal("window", { sessionStorage });
    vi.stubGlobal("sessionStorage", sessionStorage);

    setGoalChatMessageIntent("0xabc", sampleMessage);
    const stored = sessionStorage.store.get("goal-chat-intent:0xabc");
    expect(stored).toContain("hello");

    expect(consumeGoalChatMessageIntent("0xabc")).toEqual(sampleMessage);
    expect(sessionStorage.store.has("goal-chat-intent:0xabc")).toBe(false);
    expect(consumeGoalChatMessageIntent("0xabc")).toBeNull();
  });
});
