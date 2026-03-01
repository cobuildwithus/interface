import "server-only";

import { createHash, randomBytes } from "crypto";
import prisma from "@/lib/server/db/cobuild-db-client";
import { normalizeAddress } from "@/lib/shared/address";

export type BuildBotTokenView = {
  id: string;
  agentKey: string;
  label: string | null;
  createdAt: string;
  lastUsedAt: string | null;
};

const BUILD_BOT_TOKEN_VIEW_SELECT = {
  id: true,
  agentKey: true,
  label: true,
  createdAt: true,
  lastUsedAt: true,
} as const;

function buildBotPrimaryDb() {
  const withPrimary = prisma as typeof prisma & {
    $primary?: () => typeof prisma;
  };
  return typeof withPrimary.$primary === "function" ? withPrimary.$primary() : prisma;
}

export function hashBuildBotToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

function toBuildBotTokenView(row: {
  id: bigint;
  agentKey: string;
  label: string | null;
  createdAt: Date;
  lastUsedAt: Date | null;
}): BuildBotTokenView {
  return {
    id: row.id.toString(),
    agentKey: row.agentKey,
    label: row.label,
    createdAt: row.createdAt.toISOString(),
    lastUsedAt: row.lastUsedAt ? row.lastUsedAt.toISOString() : null,
  };
}

function parseId(id: string): bigint | null {
  try {
    return BigInt(id);
  } catch {
    return null;
  }
}

export async function listBuildBotCliTokens(ownerAddress: string): Promise<BuildBotTokenView[]> {
  const normalizedOwner = normalizeAddress(ownerAddress);
  const rows = await prisma.buildBotCliToken.findMany({
    where: {
      ownerAddress: normalizedOwner,
      revokedAt: null,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: BUILD_BOT_TOKEN_VIEW_SELECT,
  });

  return rows.map(toBuildBotTokenView);
}

export async function createBuildBotCliToken(params: {
  ownerAddress: string;
  agentKey?: string;
  label?: string;
}): Promise<{
  token: string;
  tokenInfo: BuildBotTokenView;
}> {
  const normalizedOwner = normalizeAddress(params.ownerAddress);
  const agentKey = params.agentKey?.trim() || "default";
  const token = `bbt_${randomBytes(32).toString("base64url")}`;
  const tokenHash = hashBuildBotToken(token);

  const created = await prisma.buildBotCliToken.create({
    data: {
      ownerAddress: normalizedOwner,
      agentKey,
      tokenHash,
      label: params.label?.trim() || null,
    },
    select: BUILD_BOT_TOKEN_VIEW_SELECT,
  });

  return {
    token,
    tokenInfo: toBuildBotTokenView(created),
  };
}

export async function revokeBuildBotCliToken(params: {
  ownerAddress: string;
  tokenId: string;
}): Promise<boolean> {
  const normalizedOwner = normalizeAddress(params.ownerAddress);
  const parsed = parseId(params.tokenId);
  if (!parsed) return false;

  const result = await prisma.buildBotCliToken.updateMany({
    where: {
      id: parsed,
      ownerAddress: normalizedOwner,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });

  return result.count > 0;
}

export async function authenticateBuildBotCliToken(rawToken: string): Promise<{
  tokenId: string;
  ownerAddress: `0x${string}`;
  agentKey: string;
} | null> {
  const tokenHash = hashBuildBotToken(rawToken);
  const db = buildBotPrimaryDb();
  const token = await db.$transaction(async (tx) => {
    const where = {
      tokenHash,
      revokedAt: null,
    } as const;

    const touched = await tx.buildBotCliToken.updateMany({
      where,
      data: {
        lastUsedAt: new Date(),
      },
    });

    if (touched.count === 0) return null;

    return tx.buildBotCliToken.findFirst({
      where,
      select: {
        id: true,
        ownerAddress: true,
        agentKey: true,
      },
    });
  });

  if (!token) return null;

  return {
    tokenId: token.id.toString(),
    ownerAddress: normalizeAddress(token.ownerAddress),
    agentKey: token.agentKey,
  };
}
