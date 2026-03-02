import "server-only";

import { unstable_cache } from "next/cache";
import { buildGoalAiContextPrompt } from "@/lib/domains/goals/ai-context/prompt";
import { chatApiBase } from "@/lib/domains/chat/api";
import { fetchChatApi } from "@/lib/domains/chat/server-api";
import type { GoalAiContextResponse } from "@/lib/domains/goals/ai-context/types";

export type { GoalAiContextResponse } from "@/lib/domains/goals/ai-context/types";

async function fetchCobuildAiContext(): Promise<GoalAiContextResponse> {
  const response = await fetchChatApi("/api/cobuild/ai-context", {
    init: {
      method: "GET",
      cache: "no-store",
    },
  });

  if (!response.ok) {
    throw new Error(`Chat API context request failed (${response.status}).`);
  }

  const payload = (await response.json()) as GoalAiContextResponse;
  const endpoint = `${chatApiBase}/api/cobuild/ai-context`;
  const prompt = buildGoalAiContextPrompt({ endpoint });

  return { ...payload, prompt };
}

export const getCobuildAiContext = unstable_cache(
  fetchCobuildAiContext,
  ["cobuild-ai-context-v1"],
  {
    revalidate: 900,
  }
);
