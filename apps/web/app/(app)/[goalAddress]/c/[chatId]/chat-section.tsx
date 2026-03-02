import type { UIMessage } from "ai";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ChatClient } from "@/components/features/chat/chat-client";
import { getPrivyIdToken, getUser } from "@/lib/domains/auth/session";
import { DEFAULT_CHAT_TYPE } from "@/lib/domains/chat/constants";
import { fetchGoalChat } from "@/lib/domains/chat/get-chat";
import { getCobuildAiContext } from "@/lib/domains/goals/ai-context/context";
import type { JsonRecord } from "@/lib/shared/json";

type GoalChatSectionProps = {
  chatId: string;
  goalAddress: string;
  context?: string;
};

const MOBILE_USER_AGENT_REGEX =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i;

export async function GoalChatSection({ chatId, goalAddress, context }: GoalChatSectionProps) {
  const headerList = await headers();
  const clientDevice = isMobileUserAgent(headerList.get("user-agent")) ? "mobile" : "desktop";
  const [userAddress, identityToken] = await Promise.all([getUser(), getPrivyIdToken()]);
  let cobuildContext: Awaited<ReturnType<typeof getCobuildAiContext>> | null = null;
  try {
    cobuildContext = await getCobuildAiContext();
  } catch {
    cobuildContext = null;
  }
  const key = `goal-chat-${chatId}-${userAddress ?? "unauth"}-${identityToken ? "auth" : "anon"}`;
  let initialMessages: UIMessage[] | undefined;
  let initialGrant: string | null | undefined;
  let chatData: JsonRecord = { goalAddress };
  let chatType = DEFAULT_CHAT_TYPE;

  if (identityToken) {
    const result = await fetchGoalChat({ chatId, identityToken });

    if (!result.ok && result.notFound) {
      notFound();
    }

    if (result.ok) {
      if (
        result.payload.data &&
        typeof result.payload.data === "object" &&
        !Array.isArray(result.payload.data)
      ) {
        chatData = { ...(result.payload.data as JsonRecord), goalAddress };
      }

      if (typeof result.payload.type === "string" && result.payload.type.trim()) {
        chatType = result.payload.type.trim();
      }

      if (Array.isArray(result.payload.messages)) {
        initialMessages = result.payload.messages;
      }

      initialGrant = result.grant;
    }
  }

  const resolvedContext = buildChatContext(cobuildContext, context);

  return (
    <ChatClient
      key={key}
      chatId={chatId}
      identityToken={identityToken}
      type={chatType}
      data={chatData}
      initialMessages={initialMessages}
      initialGrant={initialGrant}
      clientDevice={clientDevice}
      context={resolvedContext}
      showConnectOnUnauthed
    />
  );
}

function isMobileUserAgent(userAgent: string | null): boolean {
  return Boolean(userAgent && MOBILE_USER_AGENT_REGEX.test(userAgent));
}

function buildChatContext(
  cobuildContext: Awaited<ReturnType<typeof getCobuildAiContext>> | null,
  userContext?: string
): string {
  const parts: string[] = [];

  if (cobuildContext && cobuildContext.data) {
    parts.push("# Cobuild live stats snapshot");
    parts.push(`As of: ${cobuildContext.asOf}`);
    parts.push("```json");
    parts.push(JSON.stringify(cobuildContext.data));
    parts.push("```");
  }

  const cleanedUserContext = userContext?.trim();
  if (cleanedUserContext) {
    parts.push("# Additional user context");
    parts.push(cleanedUserContext);
  }

  return parts.join("\n\n");
}
