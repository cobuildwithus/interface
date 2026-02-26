"use client";

import type { RoundVariant } from "./types";
import { getRoundVariantConfig, type RoundSubmissionsRendererProps } from "./round-variant-config";

type RoundSubmissionsClientProps = RoundSubmissionsRendererProps & {
  variant: RoundVariant;
};

/**
 * Dispatches to the appropriate variant renderer.
 */
export function RoundSubmissionsClient({
  submissions,
  intentStatsByEntityId,
  isAdmin,
  ruleId,
  roundId,
  variant,
}: RoundSubmissionsClientProps) {
  const config = getRoundVariantConfig(variant);

  return config.renderSubmissions({
    submissions,
    intentStatsByEntityId,
    isAdmin,
    ruleId,
    roundId,
  });
}
