import { findDuplicateClauseTypes } from "@/lib/domains/rules/rules/unique-clause-types";
import type { PlatformScopedRuleClauses } from "@/lib/domains/rules/rules/clauses";
import {
  FARCASTER_CLAUSE_DEFINITIONS,
  X_CLAUSE_DEFINITIONS,
  type FarcasterClauseDraftType,
  type XClauseDraftType,
} from "@/lib/domains/rules/rules/platforms/registry";
import type { ClauseDraft, ClauseDraftDefinition, ClauseDraftOption } from "./types";

export type { ClauseDraft, ClauseDraftOption };
export type ClauseSelectOption<TType extends string> = { value: TType; label: string };
export type { FarcasterClauseDraftType, XClauseDraftType };

export type RuleClausesDraft = {
  farcaster: ClauseDraft<FarcasterClauseDraftType>[];
  x: ClauseDraft<XClauseDraftType>[];
};

const splitList = (raw: string): string[] =>
  raw
    .split(/[\n,]+/g)
    .map((entry) => entry.trim())
    .filter(Boolean);

function buildDefinitionMap<TType extends string, TClauseInput extends { type: TType }>(
  defs: readonly ClauseDraftDefinition<TType, TClauseInput>[]
): Record<TType, ClauseDraftDefinition<TType, TClauseInput>> {
  return Object.fromEntries(defs.map((def) => [def.type, def])) as Record<
    TType,
    ClauseDraftDefinition<TType, TClauseInput>
  >;
}

function buildClauseOptions<TType extends string, TClauseInput extends { type: TType }>(
  defs: readonly ClauseDraftDefinition<TType, TClauseInput>[]
): ClauseDraftOption<TType>[] {
  return defs.map((def) => ({
    value: def.type,
    label: def.buttonLabel,
    description: def.description,
    placeholder: def.placeholder,
  }));
}

function buildSelectOptions<TType extends string, TClauseInput extends { type: TType }>(
  defs: readonly ClauseDraftDefinition<TType, TClauseInput>[]
): ClauseSelectOption<TType>[] {
  return defs.map((def) => ({
    value: def.type,
    label: def.label,
  }));
}

function buildLabelMap<TType extends string, TClauseInput extends { type: TType }>(
  defs: readonly ClauseDraftDefinition<TType, TClauseInput>[]
): Record<TType, string> {
  return Object.fromEntries(defs.map((def) => [def.type, def.label])) as Record<TType, string>;
}

function buildHelpTextMap<TType extends string, TClauseInput extends { type: TType }>(
  defs: readonly ClauseDraftDefinition<TType, TClauseInput>[]
): Record<TType, string> {
  return Object.fromEntries(defs.map((def) => [def.type, def.helpText])) as Record<TType, string>;
}

type DraftConfig<TType extends string, TClauseInput extends { type: TType }> = {
  definitions: readonly ClauseDraftDefinition<TType, TClauseInput>[];
  definitionMap: Record<TType, ClauseDraftDefinition<TType, TClauseInput>>;
  labels: Record<TType, string>;
  helpText: Record<TType, string>;
  options: ClauseDraftOption<TType>[];
  selectOptions: ClauseSelectOption<TType>[];
};

function buildDraftConfig<TType extends string, TClauseInput extends { type: TType }>(
  defs: readonly ClauseDraftDefinition<TType, TClauseInput>[]
): DraftConfig<TType, TClauseInput> {
  return {
    definitions: defs,
    definitionMap: buildDefinitionMap(defs),
    labels: buildLabelMap(defs),
    helpText: buildHelpTextMap(defs),
    options: buildClauseOptions(defs),
    selectOptions: buildSelectOptions(defs),
  };
}

const FARCASTER_DRAFT_CONFIG = buildDraftConfig(FARCASTER_CLAUSE_DEFINITIONS);
const X_DRAFT_CONFIG = buildDraftConfig(X_CLAUSE_DEFINITIONS);

export const RULES_PLATFORM_DRAFTS = {
  farcaster: FARCASTER_DRAFT_CONFIG,
  x: X_DRAFT_CONFIG,
} as const;

export const FARCASTER_CLAUSE_DEFINITION_MAP = FARCASTER_DRAFT_CONFIG.definitionMap;
export const X_CLAUSE_DEFINITION_MAP = X_DRAFT_CONFIG.definitionMap;

export const FARCASTER_CLAUSE_LABELS = FARCASTER_DRAFT_CONFIG.labels;
export const X_CLAUSE_LABELS = X_DRAFT_CONFIG.labels;

export const FARCASTER_CLAUSE_HELP_TEXT = FARCASTER_DRAFT_CONFIG.helpText;
export const X_CLAUSE_HELP_TEXT = X_DRAFT_CONFIG.helpText;

export const FARCASTER_CLAUSE_OPTIONS = FARCASTER_DRAFT_CONFIG.options;
export const X_CLAUSE_OPTIONS = X_DRAFT_CONFIG.options;

export const FARCASTER_CLAUSE_SELECT_OPTIONS = FARCASTER_DRAFT_CONFIG.selectOptions;
export const X_CLAUSE_SELECT_OPTIONS = X_DRAFT_CONFIG.selectOptions;

type SerializeResult<T> = { ok: true; value: T } | { ok: false; error: string };

function serializePlatformClauses<TType extends string, TClauseInput extends { type: TType }>(
  clauses: ClauseDraft<TType>[],
  definitionMap: Record<TType, ClauseDraftDefinition<TType, TClauseInput>>,
  platformLabel: string
): SerializeResult<TClauseInput[]> {
  for (const dup of findDuplicateClauseTypes(clauses)) {
    return {
      ok: false,
      error: `Duplicate clause type "${dup.type}" for ${platformLabel}. Combine values into a single clause.`,
    };
  }

  const parsed: TClauseInput[] = [];

  for (const clause of clauses) {
    const def = definitionMap[clause.type];
    if (!def) {
      return { ok: false, error: `Unsupported clause type "${clause.type}" for ${platformLabel}.` };
    }

    let items = splitList(clause.raw);
    if (items.length === 0) {
      return { ok: false, error: "Each clause must have at least one value." };
    }

    if (def.normalizeItems) {
      items = def.normalizeItems(items);
      if (items.length === 0) {
        return { ok: false, error: "Each clause must have at least one value." };
      }
    }

    parsed.push(def.build(items));
  }

  return { ok: true, value: parsed };
}

export function serializeClausesDraft(
  draft: RuleClausesDraft
): SerializeResult<PlatformScopedRuleClauses> {
  const farcaster = serializePlatformClauses(
    draft.farcaster,
    FARCASTER_CLAUSE_DEFINITION_MAP,
    "farcaster"
  );
  if (!farcaster.ok) return farcaster;

  const x = serializePlatformClauses(draft.x, X_CLAUSE_DEFINITION_MAP, "x");
  if (!x.ok) return x;

  return { ok: true, value: { farcaster: farcaster.value, x: x.value } };
}

export function getClauseHelpText(type: string): string {
  return (
    FARCASTER_CLAUSE_HELP_TEXT[type as FarcasterClauseDraftType] ??
    X_CLAUSE_HELP_TEXT[type as XClauseDraftType] ??
    "Enter one per line."
  );
}
