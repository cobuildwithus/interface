export const CHAT_GRANT_HEADER = "x-chat-grant";

export const getChatGrantStorageKey = (chatId: string) => `goal-chat-grant:${chatId}`;

export function readChatGrant(chatId: string): string | null {
  if (typeof window === "undefined" || !window.sessionStorage) return null;
  try {
    return window.sessionStorage.getItem(getChatGrantStorageKey(chatId));
  } catch {
    return null;
  }
}

export function writeChatGrant(chatId: string, grant: string) {
  if (typeof window === "undefined" || !window.sessionStorage) return;
  try {
    window.sessionStorage.setItem(getChatGrantStorageKey(chatId), grant);
  } catch {}
}
