import "server-only";

import { chatApiBase } from "./api";

type ChatApiFetchOptions = {
  identityToken?: string;
  headers?: HeadersInit;
  init?: RequestInit;
};

const resolveChatApiUrl = (path: string) => {
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith("/")) return `${chatApiBase}${path}`;
  return `${chatApiBase}/${path}`;
};

const mergeHeaders = (base?: HeadersInit, extra?: HeadersInit) => {
  const merged = new Headers(base);
  if (!extra) return merged;
  new Headers(extra).forEach((value, key) => {
    merged.set(key, value);
  });
  return merged;
};

export const fetchChatApi = async (path: string, options: ChatApiFetchOptions = {}) => {
  const { identityToken, headers, init } = options;
  const resolvedCache = init?.cache ?? "no-store";
  const url = resolveChatApiUrl(path);
  const mergedHeaders = mergeHeaders(init?.headers, headers);
  const internalKey = process.env.CHAT_API_INTERNAL_KEY;
  if (identityToken) {
    mergedHeaders.set("privy-id-token", identityToken);
  }
  if (internalKey) {
    mergedHeaders.set("x-chat-internal-key", internalKey);
  }
  try {
    const response = await fetch(url, {
      ...init,
      cache: resolvedCache,
      headers: mergedHeaders,
    });
    if (!response.ok) {
      console.warn("[chat-api] request failed", {
        url,
        status: response.status,
        statusText: response.statusText,
      });
    }
    return response;
  } catch (error) {
    console.error("[chat-api] request error", {
      url,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};
