import type { JsonRecord } from "@/lib/shared/json";
import type { ChatInputMessage } from "./input-message";
import {
  hasChatInputContent,
  normalizeChatInputMessage,
  parseChatInputMessage,
  serializeChatInputMessage,
} from "./input-message";
import {
  getGoalChatCreateConfigKey,
  getGoalChatCreateIntentKey,
  getGoalChatIntentKey,
} from "./pending";

export type GoalChatCreateConfig = {
  data?: JsonRecord;
  message?: ChatInputMessage;
};

type StoredGoalChatCreateConfig = {
  data?: JsonRecord;
  message?: string;
};

const getSessionStorage = () =>
  typeof window === "undefined" ? null : (window.sessionStorage ?? null);

const readSessionStorage = (key: string) => getSessionStorage()?.getItem(key) ?? null;

const writeSessionStorage = (key: string, value: string) => {
  getSessionStorage()?.setItem(key, value);
};

const removeSessionStorage = (key: string) => {
  getSessionStorage()?.removeItem(key);
};

export const setGoalChatCreateIntent = (goalAddress: string) => {
  writeSessionStorage(getGoalChatCreateIntentKey(goalAddress), "1");
};

export const consumeGoalChatCreateIntent = (goalAddress: string) => {
  const key = getGoalChatCreateIntentKey(goalAddress);
  const pending = readSessionStorage(key);
  if (!pending) return false;
  removeSessionStorage(key);
  return true;
};

const serializeCreateConfig = (config: GoalChatCreateConfig): string | null => {
  const payload: StoredGoalChatCreateConfig = {};
  if (config.data) {
    payload.data = config.data;
  }
  if (config.message) {
    const normalized = normalizeChatInputMessage(config.message);
    if (hasChatInputContent(normalized)) {
      payload.message = serializeChatInputMessage(normalized);
    }
  }
  if (!payload.data && !payload.message) return null;
  return JSON.stringify(payload);
};

const parseCreateConfig = (raw: string | null): GoalChatCreateConfig | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredGoalChatCreateConfig | null;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const config: GoalChatCreateConfig = {};
    if (parsed.data && typeof parsed.data === "object" && !Array.isArray(parsed.data)) {
      config.data = parsed.data;
    }
    if (typeof parsed.message === "string") {
      const message = parseChatInputMessage(parsed.message);
      if (message) {
        config.message = message;
      }
    }
    if (!config.data && !config.message) return null;
    return config;
  } catch {
    return null;
  }
};

export const setGoalChatCreateConfig = (goalAddress: string, config: GoalChatCreateConfig) => {
  const serialized = serializeCreateConfig(config);
  const key = getGoalChatCreateConfigKey(goalAddress);
  if (!serialized) {
    removeSessionStorage(key);
    return;
  }
  writeSessionStorage(key, serialized);
};

export const consumeGoalChatCreateConfig = (goalAddress: string): GoalChatCreateConfig | null => {
  const key = getGoalChatCreateConfigKey(goalAddress);
  const stored = parseCreateConfig(readSessionStorage(key));
  if (!stored) return null;
  removeSessionStorage(key);
  return stored;
};

export const setGoalChatMessageIntent = (goalAddress: string, message: ChatInputMessage) => {
  writeSessionStorage(getGoalChatIntentKey(goalAddress), serializeChatInputMessage(message));
};

export const peekGoalChatMessageIntent = (goalAddress: string) =>
  parseChatInputMessage(readSessionStorage(getGoalChatIntentKey(goalAddress)));

export const consumeGoalChatMessageIntent = (goalAddress: string) => {
  const key = getGoalChatIntentKey(goalAddress);
  const pending = parseChatInputMessage(readSessionStorage(key));
  if (!pending) return null;
  removeSessionStorage(key);
  return pending;
};
