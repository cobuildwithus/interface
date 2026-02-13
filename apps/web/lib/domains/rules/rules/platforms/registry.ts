export {
  FARCASTER_CLAUSE_DEFINITIONS,
  FARCASTER_CLAUSE_TYPES,
  farcasterClauseSchema,
  farcasterRulesAdapter,
  coerceFarcasterSummaryFromSuccess,
  extractFarcasterSummaryFromError,
  formatFarcasterRulesError,
  type FarcasterClauseInput,
  type FarcasterClauseType,
  type FarcasterClauseDraftType,
  type FarcasterRuleSummary,
} from "./farcaster";
export {
  X_CLAUSE_DEFINITIONS,
  X_CLAUSE_TYPES,
  xClauseSchema,
  xRulesAdapter,
  coerceXSummaryFromSuccess,
  extractXSummaryFromError,
  formatXRulesError,
  type XClauseInput,
  type XClauseType,
  type XClauseDraftType,
  type XRuleSummary,
} from "./x";

import { farcasterRulesAdapter } from "./farcaster";
import { xRulesAdapter } from "./x";

export const RULES_PLATFORM_ADAPTERS = {
  farcaster: farcasterRulesAdapter,
  x: xRulesAdapter,
} as const;
