import { type NextResponse } from "next/server";
import prisma, { prismaPrimary } from "@/lib/server/db/cobuild-db-client";
import { isPrismaUniqueViolation } from "@/lib/server/cli/prisma-errors";
import { parseEtherInput } from "./validation";
import { buildSuccessResponse, IdempotencyConflictError } from "./response";

const CLI_TX_LOG_REPLAY_SELECT = {
  kind: true,
  network: true,
  to: true,
  token: true,
  amount: true,
  decimals: true,
  valueEth: true,
  data: true,
  txHash: true,
} as const;

export type CliTxLogReplayRecord = {
  kind: string;
  network: string;
  to: string;
  token: string | null;
  amount: string | null;
  decimals: number | null;
  valueEth: string | null;
  data: string | null;
  txHash: string | null;
};

export type CliExecDb = {
  cliTxLog: {
    findUnique: typeof prisma.cliTxLog.findUnique;
    create: typeof prisma.cliTxLog.create;
    update: typeof prisma.cliTxLog.update;
  };
};

export type CliTxLogCreateData = Parameters<typeof prisma.cliTxLog.create>[0]["data"];

export function cliExecPrimaryDb(): CliExecDb {
  return prismaPrimary(prisma) as CliExecDb;
}

async function findCliTxLogByIdempotency(params: {
  db: CliExecDb;
  ownerAddress: `0x${string}`;
  agentKey: string;
  idempotencyKey: string | null;
}): Promise<CliTxLogReplayRecord | null> {
  if (!params.idempotencyKey) return null;

  return params.db.cliTxLog.findUnique({
    where: {
      ownerAddress_agentKey_idempotencyKey: {
        ownerAddress: params.ownerAddress,
        agentKey: params.agentKey,
        idempotencyKey: params.idempotencyKey,
      },
    },
    select: CLI_TX_LOG_REPLAY_SELECT,
  });
}

async function tryReserveCliTxLog(params: {
  db: CliExecDb;
  data: CliTxLogCreateData;
}): Promise<boolean> {
  try {
    await params.db.cliTxLog.create({
      data: params.data,
    });
    return true;
  } catch (error) {
    if (isPrismaUniqueViolation(error)) {
      return false;
    }
    throw error;
  }
}

export async function finalizeCliTxLog(params: {
  db: CliExecDb;
  ownerAddress: `0x${string}`;
  agentKey: string;
  idempotencyKey: string;
  txHash: string | null;
}) {
  await params.db.cliTxLog.update({
    where: {
      ownerAddress_agentKey_idempotencyKey: {
        ownerAddress: params.ownerAddress,
        agentKey: params.agentKey,
        idempotencyKey: params.idempotencyKey,
      },
    },
    data: {
      txHash: params.txHash,
    },
  });
}

export async function writeCliTxLog(params: { db: CliExecDb; data: CliTxLogCreateData }) {
  try {
    await params.db.cliTxLog.create({
      data: params.data,
    });
  } catch (error) {
    console.error("[cli][exec] failed to persist tx log", error);
  }
}

export function assertTransferIdempotencyMatch(params: {
  existing: CliTxLogReplayRecord;
  network: string;
  to: string;
  token: "eth" | "usdc" | `0x${string}`;
  amount: string;
  decimals: number | null;
}) {
  if (
    params.existing.kind !== "transfer" ||
    params.existing.network !== params.network ||
    params.existing.to !== params.to ||
    params.existing.token !== params.token ||
    params.existing.amount !== params.amount ||
    params.existing.decimals !== params.decimals
  ) {
    throw new IdempotencyConflictError(
      "Idempotency key is already associated with a different transfer request"
    );
  }
}

export function assertTxIdempotencyMatch(params: {
  existing: CliTxLogReplayRecord;
  network: string;
  to: string;
  valueWei: bigint;
  data: `0x${string}`;
}) {
  if (
    params.existing.kind !== "tx" ||
    params.existing.network !== params.network ||
    params.existing.to !== params.to ||
    params.existing.data !== params.data
  ) {
    throw new IdempotencyConflictError(
      "Idempotency key is already associated with a different transaction request"
    );
  }

  const loggedValueEth = params.existing.valueEth;
  if (typeof loggedValueEth !== "string") {
    throw new IdempotencyConflictError("Stored idempotency record is missing valueEth");
  }

  const loggedValueWei = parseEtherInput(loggedValueEth, "stored valueEth");
  if (loggedValueWei !== params.valueWei) {
    throw new IdempotencyConflictError(
      "Idempotency key is already associated with a different transaction request"
    );
  }
}

function assertIdempotencyFinalized(existing: CliTxLogReplayRecord) {
  if (!existing.txHash) {
    throw new IdempotencyConflictError(
      "Idempotency key is already associated with a pending or failed request"
    );
  }
}

export async function replayIfFinalized(params: {
  db: CliExecDb;
  ownerAddress: `0x${string}`;
  agentKey: string;
  idempotencyKey: string | null;
  walletAddress?: string;
  kind: "transfer" | "tx";
  assertMatch: (existing: CliTxLogReplayRecord) => void;
}): Promise<NextResponse | null> {
  const existing = await findCliTxLogByIdempotency({
    db: params.db,
    ownerAddress: params.ownerAddress,
    agentKey: params.agentKey,
    idempotencyKey: params.idempotencyKey,
  });
  if (!existing) {
    return null;
  }

  params.assertMatch(existing);
  assertIdempotencyFinalized(existing);
  if (!params.walletAddress) {
    throw new Error("Wallet address is required for replayed response");
  }

  return buildSuccessResponse({
    kind: params.kind,
    walletAddress: params.walletAddress,
    network: existing.network,
    transactionHash: existing.txHash,
    replayed: true,
  });
}

export async function reserveOrReplay(params: {
  db: CliExecDb;
  ownerAddress: `0x${string}`;
  agentKey: string;
  idempotencyKey: string | null;
  data: CliTxLogCreateData;
  walletAddress?: string;
  kind: "transfer" | "tx";
  assertMatch: (existing: CliTxLogReplayRecord) => void;
}): Promise<{ reserved: true } | { response: NextResponse }> {
  if (!params.idempotencyKey) {
    return { reserved: true };
  }

  const reserved = await tryReserveCliTxLog({
    db: params.db,
    data: params.data,
  });
  if (reserved) {
    return { reserved: true };
  }

  const raced = await findCliTxLogByIdempotency({
    db: params.db,
    ownerAddress: params.ownerAddress,
    agentKey: params.agentKey,
    idempotencyKey: params.idempotencyKey,
  });
  if (!raced) {
    throw new Error("Failed to read idempotency reservation after unique violation");
  }
  params.assertMatch(raced);
  assertIdempotencyFinalized(raced);
  if (!params.walletAddress) {
    throw new Error("Wallet address is required for replayed response");
  }

  return {
    response: buildSuccessResponse({
      kind: params.kind,
      walletAddress: params.walletAddress,
      network: raced.network,
      transactionHash: raced.txHash,
      replayed: true,
    }),
  };
}
