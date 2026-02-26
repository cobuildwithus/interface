import type { GoalAiContextResponse } from "@/lib/domains/goals/ai-context/context";
import { getCobuildAiContext } from "@/lib/domains/goals/ai-context/context";

const statsEndpoint = "/api/cobuild/ai-context";
const publicEndpoint = `https://co.build${statsEndpoint}`;

export async function getStatsContent(
  statsPromise?: Promise<GoalAiContextResponse>
): Promise<string> {
  let statsResponse: GoalAiContextResponse | null = null;
  let statsError: string | null = null;

  try {
    statsResponse = await (statsPromise ?? getCobuildAiContext());
  } catch (err) {
    statsError = err instanceof Error ? err.message : "Failed to fetch stats";
  }

  const linkLine = `**API**: [${publicEndpoint}](${publicEndpoint})`;
  const exampleSnippet = ["```bash", `curl -s ${publicEndpoint}`, "```"].join("\n");

  let responseBlock = "_No live stats available._";
  if (statsError) {
    responseBlock = `**Error:** ${statsError}`;
  } else if (statsResponse) {
    responseBlock = ["```json", JSON.stringify(statsResponse, null, 2), "```"].join("\n");
  }

  return [
    "**Cobuild live stats**",
    "",
    linkLine,
    "",
    "#### Example",
    exampleSnippet,
    "",
    "#### Response",
    responseBlock,
  ].join("\n");
}
