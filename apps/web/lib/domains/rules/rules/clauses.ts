import { z } from "zod";
import { findDuplicateClauseTypes } from "@/lib/domains/rules/rules/unique-clause-types";
import { farcasterClauseSchema, xClauseSchema } from "@/lib/domains/rules/rules/platforms/registry";

export type {
  FarcasterClauseInput,
  XClauseInput,
} from "@/lib/domains/rules/rules/platforms/registry";

export const platformScopedRuleClausesSchema = z
  .object({
    farcaster: z.array(farcasterClauseSchema).default([]),
    x: z.array(xClauseSchema).default([]),
  })
  .superRefine((clauses, ctx) => {
    for (const dup of findDuplicateClauseTypes(clauses.farcaster)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate clause type "${dup.type}" for farcaster. Combine values into a single clause.`,
        path: ["farcaster", dup.index, "type"],
      });
    }

    for (const dup of findDuplicateClauseTypes(clauses.x)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate clause type "${dup.type}" for x. Combine values into a single clause.`,
        path: ["x", dup.index, "type"],
      });
    }
  });

export type PlatformScopedRuleClauses = z.infer<typeof platformScopedRuleClausesSchema>;
