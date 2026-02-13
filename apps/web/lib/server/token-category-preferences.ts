import "server-only";

import { TokenCategory } from "@/generated/prisma/enums";
import prisma from "@/lib/server/db/cobuild-db-client";
import { type ErrorResult, type OkResult } from "@/lib/server/result";
import { isRecord } from "@/lib/server/validation";
import type { JsonRecord, JsonValue } from "@/lib/shared/json";

export type TokenCategoryPreferencesResponse = {
  disallowedCategories: TokenCategory[];
};

// Keep the canonical ordering aligned with the enum in the database.
const ALL_CATEGORIES: TokenCategory[] = ["zora", "juicebox", "clanker", "erc20", "cobuild"];

function isValidCategory(value: string): value is TokenCategory {
  return (ALL_CATEGORIES as readonly string[]).includes(value);
}

export async function getTokenCategoryPreferencesForAddress(
  address: string | null
): Promise<OkResult<TokenCategoryPreferencesResponse> | ErrorResult> {
  if (!address) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  try {
    const normalizedOwner = address.toLowerCase();
    const rows = await prisma.userDisallowedTokenCategory.findMany({
      where: { ownerAddress: normalizedOwner },
      select: { category: true },
      orderBy: { category: "asc" },
    });

    return { ok: true, data: { disallowedCategories: rows.map((row) => row.category) } };
  } catch {
    return { ok: false, status: 500, error: "Unable to load coin filters." };
  }
}

export async function updateTokenCategoryPreferencesForAddress(
  address: string | null,
  body: JsonValue | null | undefined
): Promise<OkResult<TokenCategoryPreferencesResponse> | ErrorResult> {
  if (!address) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  if (!isRecord(body)) {
    return { ok: false, status: 400, error: "Invalid request body" };
  }

  const disallowed = (body as JsonRecord).disallowedCategories;
  if (!Array.isArray(disallowed)) {
    return { ok: false, status: 400, error: "disallowedCategories must be an array" };
  }

  const nextSet = new Set<TokenCategory>();
  for (const value of disallowed) {
    if (typeof value !== "string" || !isValidCategory(value)) {
      return { ok: false, status: 400, error: `Unknown category: ${String(value)}` };
    }
    nextSet.add(value);
  }

  if (nextSet.size === ALL_CATEGORIES.length) {
    return {
      ok: false,
      status: 400,
      error: "At least one category must remain allowed",
    };
  }

  const disallowedCategories = Array.from(nextSet.values());
  const normalizedOwner = address.toLowerCase();

  await prisma.$transaction(async (tx) => {
    await tx.userDisallowedTokenCategory.deleteMany({
      where: { ownerAddress: normalizedOwner },
    });
    if (disallowedCategories.length === 0) return;

    await tx.userDisallowedTokenCategory.createMany({
      data: disallowedCategories.map((category) => ({
        ownerAddress: normalizedOwner,
        category,
      })),
      skipDuplicates: true,
    });
  });

  return { ok: true, data: { disallowedCategories } };
}
