import "server-only";

import type { UIMessage } from "ai";
import type { ErrorLike } from "@/lib/shared/errors";
import type { JsonRecord } from "@/lib/shared/json";
import { fetchChatApi } from "./server-api";
import { resolveFetchError, resolveResponseError } from "./request-errors";

export type GoalChatPayload = {
  messages?: UIMessage[];
  type?: string;
  data?: JsonRecord | null;
};

export type GoalChatFetchResult =
  | {
      ok: true;
      status: number;
      payload: GoalChatPayload;
      grant: string | null;
    }
  | {
      ok: false;
      status?: number;
      error: string;
      notFound?: boolean;
    };

export const fetchGoalChat = async ({
  chatId,
  identityToken,
}: {
  chatId: string;
  identityToken: string;
}): Promise<GoalChatFetchResult> => {
  try {
    const response = await fetchChatApi(`/api/chat/${chatId}`, {
      identityToken,
    });

    if (!response.ok) {
      const error = await resolveResponseError(response);
      return {
        ok: false,
        status: response.status,
        error,
        notFound: response.status === 404,
      };
    }

    let payload: GoalChatPayload | null = null;
    try {
      payload = (await response.json()) as GoalChatPayload | null;
    } catch {
      return {
        ok: false,
        status: response.status,
        error: "Chat API returned invalid JSON.",
      };
    }

    if (!payload || typeof payload !== "object") {
      return {
        ok: false,
        status: response.status,
        error: "Chat API returned invalid JSON.",
      };
    }

    return {
      ok: true,
      status: response.status,
      payload,
      grant: response.headers.get("x-chat-grant"),
    };
  } catch (error) {
    return { ok: false, error: resolveFetchError(error as ErrorLike) };
  }
};
