import type { ErrorLike } from "@/lib/shared/errors";
import type { JsonRecord } from "@/lib/shared/json";
import { chatApiBase } from "./api";
import { DEFAULT_CHAT_TYPE } from "./constants";
import { getChatGeoHeaders } from "./geo";
import { resolveFetchError, resolveResponseError } from "./request-errors";

type CreateGoalChatResult = {
  chatId: string;
  chatGrant?: string;
};

type CreateGoalChatResponse = {
  chatId?: string;
  chatGrant?: string;
};

export type CreateGoalChatOutcome =
  | { ok: true; status: number; data: CreateGoalChatResult }
  | { ok: false; status?: number; error?: string };

export const isAuthExpiredStatus = (status?: number) => status === 401 || status === 403;

export const createGoalChat = async ({
  goalAddress,
  identityToken,
  type = DEFAULT_CHAT_TYPE,
  data,
}: {
  goalAddress: string;
  identityToken?: string;
  type?: string;
  data?: JsonRecord;
}): Promise<CreateGoalChatOutcome> => {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...getChatGeoHeaders(),
    };

    if (identityToken) {
      headers["privy-id-token"] = identityToken;
    }

    const response = await fetch(`${chatApiBase}/api/chat/new`, {
      method: "POST",
      headers,
      body: JSON.stringify({ type, data: { ...(data ?? {}), goalAddress } }),
    });

    if (!response.ok) {
      const error = await resolveResponseError(response);
      return { ok: false, status: response.status, error };
    }

    let payload: CreateGoalChatResponse | null = null;
    let parseError = false;
    try {
      payload = (await response.json()) as CreateGoalChatResponse | null;
    } catch {
      parseError = true;
    }
    if (!payload?.chatId) {
      return {
        ok: false,
        status: response.status,
        error: parseError
          ? "Chat API returned invalid JSON."
          : "Chat API response missing a chat id.",
      };
    }

    return {
      ok: true,
      status: response.status,
      data: { chatId: payload.chatId, chatGrant: payload.chatGrant },
    };
  } catch (error) {
    return { ok: false, error: resolveFetchError(error as ErrorLike) };
  }
};
