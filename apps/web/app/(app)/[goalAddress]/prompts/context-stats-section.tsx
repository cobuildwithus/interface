import type { GoalAiContextResponse } from "@/lib/domains/goals/ai-context/context";
import { ContextSection } from "./context-section";
import { getStatsContent } from "./stats-content";

export async function ContextStatsSection({
  statsPromise,
}: {
  statsPromise: Promise<GoalAiContextResponse>;
}) {
  const statsContent = await getStatsContent(statsPromise);

  return (
    <ContextSection
      index={5}
      title="Live Stats API"
      subtitle="Real-time treasury, issuance, mints, and holder metrics"
      content={statsContent}
      accentColor="bg-gradient-to-br from-rose-500 to-pink-600"
    />
  );
}
