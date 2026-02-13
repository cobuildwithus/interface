import type { Prisma } from "@/generated/prisma/client";
import { normalizeEntityId } from "@/lib/shared/entity-id";
import type { JsonRecord, JsonValue } from "@/lib/shared/json";
import { getBeneficiaryAddressFromMetadata } from "@/lib/domains/rounds/submission-metadata";
import type {
  RoundSubmission,
  RoundSubmissionAiOutput,
  RoundSubmissionSource,
} from "@/types/round-submission";
import type { SubmissionRow } from "./types";

const NORMALIZE_OPTIONS = { allowUnknown: true, unknownCase: "preserve" } as const;
type AnyJsonValue = JsonValue | Prisma.JsonValue;

export function parseRoundId(roundId: string): bigint | null {
  const str = `${roundId ?? ""}`.trim();
  if (!/^\d+$/.test(str)) return null;
  return BigInt(str);
}

export function toRecord(value: AnyJsonValue | null | undefined): JsonRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  const record: JsonRecord = {};
  for (const [key, raw] of Object.entries(value)) {
    if (raw !== undefined) record[key] = raw as JsonValue;
  }
  return record;
}

export function toIsoString(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

export function toAiOutput(
  ai: {
    id: bigint;
    model: string | null;
    output: AnyJsonValue;
    createdAt: Date | null;
  } | null
): RoundSubmissionAiOutput | null {
  if (!ai?.createdAt) return null;
  return {
    id: ai.id.toString(),
    model: ai.model ?? "",
    output: toRecord(ai.output),
    createdAt: ai.createdAt.toISOString(),
  };
}

export function normalizeSubmissionId(value: string | number | null | undefined): string | null {
  if (typeof value !== "string") return null;
  return normalizeEntityId(value, NORMALIZE_OPTIONS);
}

export function firstNonEmptyString(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    const trimmed = `${value ?? ""}`.trim();
    if (trimmed) return trimmed;
  }
  return "";
}

export function getSubmissionUiFields(params: {
  source: RoundSubmissionSource;
  authorHandle: string | null;
  authorDisplayName: string | null;
  authorAvatarUrl: string | null;
  aiTitle: string | null;
  displayText: string | null;
  rawText: string | null;
}) {
  const rawHandle = `${params.authorHandle ?? ""}`.trim();
  const handle = rawHandle.replace(/^@/, "") || (params.source === "x" ? "x" : "fc");

  const displayName =
    `${params.authorDisplayName ?? ""}`.trim() ||
    (params.source === "farcaster"
      ? handle !== "fc"
        ? `@${handle}`
        : "Farcaster"
      : handle !== "x"
        ? `@${handle}`
        : "X");

  const summaryText =
    firstNonEmptyString(params.aiTitle, params.displayText, params.rawText) || "Untitled";

  return { handle, displayName, avatarUrl: params.authorAvatarUrl ?? null, summaryText };
}

export function buildRoundSubmission(row: SubmissionRow): RoundSubmission {
  const normalizedPostId = normalizeSubmissionId(row.postId) ?? row.postId.trim();
  const rawText = row.rawText ?? null;
  const displayText = row.displayText ?? rawText;
  const ui = getSubmissionUiFields({
    source: row.source,
    authorHandle: row.authorHandle ?? null,
    authorDisplayName: row.authorDisplayName ?? null,
    authorAvatarUrl: row.authorAvatarUrl ?? null,
    aiTitle: row.aiTitle,
    displayText,
    rawText,
  });

  const evalScore =
    row.evalShare != null
      ? {
          share: Number(row.evalShare),
          rank: row.evalRank != null ? Number(row.evalRank) : null,
          winRate: row.evalWinRate ?? null,
        }
      : null;

  return {
    source: row.source,
    postId: normalizedPostId,
    entityId: normalizedPostId,
    url: row.url ?? null,
    createdAt: toIsoString(row.createdAt ?? row.insertedAt),
    aiTitle: row.aiTitle,
    aiCategory: row.aiCategory,
    authorHandle: row.authorHandle ?? null,
    authorDisplayName: row.authorDisplayName ?? null,
    authorAvatarUrl: row.authorAvatarUrl ?? null,
    rawText,
    displayText,
    mediaUrls: row.mediaUrls ?? [],
    handle: ui.handle,
    displayName: ui.displayName,
    avatarUrl: ui.avatarUrl,
    summaryText: ui.summaryText,
    beneficiaryAddress: getBeneficiaryAddressFromMetadata(row.metadata),
    evalScore,
    aiOutput: row.aiOutput ?? null,
  };
}
