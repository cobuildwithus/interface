export const ALLOWED_REACTIONS = ["like", "recast", "comment", "quote_cast", "follow"] as const;

export type ReactionType = (typeof ALLOWED_REACTIONS)[number];
