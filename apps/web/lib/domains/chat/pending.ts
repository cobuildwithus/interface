import type { ChatInputMessage } from "./input-message";
import { parseChatInputMessage, serializeChatInputMessage } from "./input-message";

const GOAL_CHAT_INTENT_PREFIX = "goal-chat-intent";
const GOAL_CHAT_CREATE_INTENT_PREFIX = "goal-chat-create-intent";
const GOAL_CHAT_CREATE_CONFIG_PREFIX = "goal-chat-create-config";
const GOAL_CHAT_PENDING_PREFIX = "goal-chat-pending";

export type PendingChatMessage = ChatInputMessage;

export const getGoalChatIntentKey = (goalAddress: string) =>
  `${GOAL_CHAT_INTENT_PREFIX}:${goalAddress}`;

export const getGoalChatCreateIntentKey = (goalAddress: string) =>
  `${GOAL_CHAT_CREATE_INTENT_PREFIX}:${goalAddress}`;

export const getGoalChatCreateConfigKey = (goalAddress: string) =>
  `${GOAL_CHAT_CREATE_CONFIG_PREFIX}:${goalAddress}`;

export const getGoalChatPendingKey = (chatId: string) => `${GOAL_CHAT_PENDING_PREFIX}:${chatId}`;

export const serializePendingChatMessage = (message: PendingChatMessage) =>
  serializeChatInputMessage(message);

export const parsePendingChatMessage = (value: string | null): PendingChatMessage | null =>
  parseChatInputMessage(value);

export const storePendingChatMessage = (chatId: string, message: PendingChatMessage) => {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(
    getGoalChatPendingKey(chatId),
    serializePendingChatMessage(message)
  );
};
