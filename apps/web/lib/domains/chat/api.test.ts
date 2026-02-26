import { afterEach, describe, expect, it, vi } from "vitest";

const loadModule = async () => {
  vi.resetModules();
  return import("./api");
};

const env = process.env as Record<string, string | undefined>;
type WindowStub = { location: { hostname: string; origin: string } };
const globalScope = globalThis as { window?: WindowStub };

const setEnvValue = (key: string, value: string | undefined) => {
  if (value === undefined) {
    Reflect.deleteProperty(env, key);
  } else {
    env[key] = value;
  }
};

const setWindowValue = (value?: WindowStub) => {
  if (value === undefined) {
    Reflect.deleteProperty(globalScope, "window");
  } else {
    globalScope.window = value;
  }
};

const originalEnv = {
  chatApiUrl: env.NEXT_PUBLIC_CHAT_API_URL,
  siteUrl: env.NEXT_PUBLIC_SITE_URL,
  nodeEnv: env.NODE_ENV,
};
const originalWindow = globalScope.window;

afterEach(() => {
  setEnvValue("NEXT_PUBLIC_CHAT_API_URL", originalEnv.chatApiUrl);
  setEnvValue("NEXT_PUBLIC_SITE_URL", originalEnv.siteUrl);
  setEnvValue("NODE_ENV", originalEnv.nodeEnv);
  setWindowValue(originalWindow);
});

describe("chatApiBase", () => {
  it("defaults to localhost when env is unset", async () => {
    setEnvValue("NEXT_PUBLIC_CHAT_API_URL", undefined);
    const { chatApiBase } = await loadModule();
    expect(chatApiBase).toBe("http://localhost:4000");
  });

  it("uses the env value when provided", async () => {
    env.NEXT_PUBLIC_CHAT_API_URL = "https://example.com";
    const { chatApiBase } = await loadModule();
    expect(chatApiBase).toBe("https://example.com");
  });

  it("strips trailing slashes from env values", async () => {
    env.NEXT_PUBLIC_CHAT_API_URL = "https://example.com/";
    const { chatApiBase } = await loadModule();
    expect(chatApiBase).toBe("https://example.com");
  });

  it("uses the window origin for non-localhost hosts", async () => {
    setEnvValue("NEXT_PUBLIC_CHAT_API_URL", undefined);
    globalScope.window = {
      location: { hostname: "cobuild.xyz", origin: "https://cobuild.xyz/" },
    };
    const { chatApiBase } = await loadModule();
    expect(chatApiBase).toBe("https://cobuild.xyz");
  });

  it("routes localhost window hosts to the chat server port", async () => {
    setEnvValue("NEXT_PUBLIC_CHAT_API_URL", undefined);
    globalScope.window = {
      location: { hostname: "localhost", origin: "http://localhost:3000" },
    };
    const { chatApiBase } = await loadModule();
    expect(chatApiBase).toBe("http://localhost:4000");
  });

  it("uses the site url in production when window is missing", async () => {
    setEnvValue("NEXT_PUBLIC_CHAT_API_URL", undefined);
    env.NODE_ENV = "production";
    env.NEXT_PUBLIC_SITE_URL = "https://site.example.com/";
    setWindowValue(undefined);
    const { chatApiBase } = await loadModule();
    expect(chatApiBase).toBe("https://site.example.com");
  });
});
