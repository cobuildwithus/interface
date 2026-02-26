import { ALLOWED_REACTIONS, type ReactionType } from "@/lib/domains/rules/rules/reaction-types";

export { ALLOWED_REACTIONS };
export type { ReactionType };

export const DEFAULT_RULE_AMOUNTS_USD: Record<ReactionType, string> = {
  like: "0.1",
  recast: "0.1",
  comment: "0.1",
  quote_cast: "0.1",
  follow: "0.25",
};
