const DEFAULT_CHAT_API_BASE = "http://localhost:4000";

const stripTrailingSlash = (value: string) => value.replace(/\/$/, "");

const resolveChatApiBase = () => {
  const envValue = process.env.NEXT_PUBLIC_CHAT_API_URL;
  if (envValue) return stripTrailingSlash(envValue);

  if (typeof window !== "undefined") {
    const { hostname, origin } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return `http://${hostname}:4000`;
    }
    return stripTrailingSlash(origin);
  }

  if (process.env.NODE_ENV === "production") {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (siteUrl) return stripTrailingSlash(siteUrl);
  }

  return DEFAULT_CHAT_API_BASE;
};

export const chatApiBase = resolveChatApiBase();
