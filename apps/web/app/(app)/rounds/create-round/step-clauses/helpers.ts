import type { ClauseDraftOption } from "@/lib/domains/rules/rules/core/drafts";
import type { ClauseDraft } from "../types";

export type ClauseOption<T extends string> = ClauseDraftOption<T>;

export const createClause = <T extends string>(type: T): ClauseDraft<T> => ({
  id: crypto.randomUUID(),
  type,
  raw: "",
});

export const isClauseTypeTaken = <T extends string>(
  clauses: ClauseDraft<T>[],
  type: T,
  currentId: string
): boolean => clauses.some((clause) => clause.type === type && clause.id !== currentId);

export const nextAvailableType = <T extends string>(
  clauses: ClauseDraft<T>[],
  options: ClauseOption<T>[]
): T | null => {
  const used = new Set(clauses.map((clause) => clause.type));
  const available = options.find((opt) => !used.has(opt.value));
  return available?.value ?? null;
};
