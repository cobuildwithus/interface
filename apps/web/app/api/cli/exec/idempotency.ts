import { type NextResponse } from "next/server";
import { canonicalizeBaseBuilderCodeAttributedData } from "@cobuild/wire";
import type { Hex } from "viem";
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
  userOpHash: true,
  status: true,
  expiresAt: true,
  updatedAt: true,
} as const;

const CLI_TX_LOG_RESERVATION_TTL_MS = 30_000;

export const CLI_TX_LOG_STATUSES = {
  PENDING: "pending",
  SUBMITTED: "submitted",
  TIMED_OUT: "timed_out",
  CONFIRMED: "confirmed",
  FAILED: "failed",
  EXPIRED: "expired",
} as const;

export type CliTxLogStatus = (typeof CLI_TX_LOG_STATUSES)[keyof typeof CLI_TX_LOG_STATUSES];

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
  userOpHash: string | null;
  status: string;
  expiresAt: Date | null;
  updatedAt: Date;
};

export type CliExecDb = {
  cliTxLog: {
    findUnique: typeof prisma.cliTxLog.findUnique;
    create: typeof prisma.cliTxLog.create;
    update: typeof prisma.cliTxLog.update;
    updateMany: typeof prisma.cliTxLog.updateMany;
  };
};

export type CliTxLogCreateData = Parameters<typeof prisma.cliTxLog.create>[0]["data"];
type CliTxLogUpdateData = Parameters<typeof prisma.cliTxLog.update>[0]["data"];

type ReserveOrReplayResult =
  | { reserved: true }
  | { response: NextResponse }
  | { resumeUserOpHash: `0x${string}` };

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

function reservationExpiresAt(): Date {
  return new Date(Date.now() + CLI_TX_LOG_RESERVATION_TTL_MS);
}

function isReservationExpired(existing: CliTxLogReplayRecord): boolean {
  return (
    existing.status === CLI_TX_LOG_STATUSES.PENDING &&
    existing.expiresAt instanceof Date &&
    existing.expiresAt.getTime() <= Date.now()
  );
}

function createReservationData(data: CliTxLogCreateData): CliTxLogCreateData {
  return {
    ...data,
    status: CLI_TX_LOG_STATUSES.PENDING,
    txHash: null,
    userOpHash: null,
    expiresAt: reservationExpiresAt(),
  };
}

function createReservationUpdateData(data: CliTxLogCreateData): CliTxLogUpdateData {
  return {
    ...data,
    status: CLI_TX_LOG_STATUSES.PENDING,
    txHash: null,
    userOpHash: null,
    expiresAt: reservationExpiresAt(),
    updatedAt: new Date(),
  };
}

async function tryReserveCliTxLog(params: {
  db: CliExecDb;
  data: CliTxLogCreateData;
}): Promise<boolean> {
  try {
    await params.db.cliTxLog.create({
      data: createReservationData(params.data),
    });
    return true;
  } catch (error) {
    if (isPrismaUniqueViolation(error)) {
      return false;
    }
    throw error;
  }
}

async function resetCliTxLogReservation(params: {
  db: CliExecDb;
  ownerAddress: `0x${string}`;
  agentKey: string;
  idempotencyKey: string;
  existing: CliTxLogReplayRecord;
  data: CliTxLogCreateData;
}): Promise<boolean> {
  const reset = await params.db.cliTxLog.updateMany({
    where: {
      ownerAddress: params.ownerAddress,
      agentKey: params.agentKey,
      idempotencyKey: params.idempotencyKey,
      status: params.existing.status,
      updatedAt: params.existing.updatedAt,
    },
    data: createReservationUpdateData(params.data),
  });
  return reset.count === 1;
}

export async function markCliTxSubmitted(params: {
  db: CliExecDb;
  ownerAddress: `0x${string}`;
  agentKey: string;
  idempotencyKey: string;
  userOpHash: `0x${string}`;
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
      status: CLI_TX_LOG_STATUSES.SUBMITTED,
      userOpHash: params.userOpHash,
      expiresAt: null,
    },
  });
}

export async function markCliTxTimedOut(params: {
  db: CliExecDb;
  ownerAddress: `0x${string}`;
  agentKey: string;
  idempotencyKey: string;
  userOpHash: `0x${string}`;
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
      status: CLI_TX_LOG_STATUSES.TIMED_OUT,
      userOpHash: params.userOpHash,
      expiresAt: null,
    },
  });
}

export async function finalizeCliTxLog(params: {
  db: CliExecDb;
  ownerAddress: `0x${string}`;
  agentKey: string;
  idempotencyKey: string;
  txHash: string | null;
  userOpHash?: `0x${string}`;
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
      status: CLI_TX_LOG_STATUSES.CONFIRMED,
      txHash: params.txHash,
      userOpHash: params.userOpHash,
      expiresAt: null,
    },
  });
}

export async function failCliTxLog(params: {
  db: CliExecDb;
  ownerAddress: `0x${string}`;
  agentKey: string;
  idempotencyKey: string;
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
      status: CLI_TX_LOG_STATUSES.FAILED,
      expiresAt: null,
    },
  });
}

export async function expireCliTxLog(params: {
  db: CliExecDb;
  ownerAddress: `0x${string}`;
  agentKey: string;
  idempotencyKey: string;
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
      status: CLI_TX_LOG_STATUSES.EXPIRED,
      expiresAt: null,
    },
  });
}

export async function writeCliTxLog(params: { db: CliExecDb; data: CliTxLogCreateData }) {
  try {
    await params.db.cliTxLog.create({
      data: {
        ...params.data,
        status: CLI_TX_LOG_STATUSES.CONFIRMED,
        expiresAt: null,
      },
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
  const existingData =
    typeof params.existing.data === "string"
      ? canonicalizeBaseBuilderCodeAttributedData(params.existing.data as Hex)
      : null;
  const requestedData = canonicalizeBaseBuilderCodeAttributedData(params.data as Hex);
  if (
    params.existing.kind !== "tx" ||
    params.existing.network !== params.network ||
    params.existing.to !== params.to ||
    existingData !== requestedData
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

function buildReplayResponse(params: {
  kind: "transfer" | "tx";
  walletAddress?: string;
  existing: CliTxLogReplayRecord;
}) {
  if (!params.walletAddress) {
    throw new Error("Wallet address is required for replayed response");
  }

  return buildSuccessResponse({
    kind: params.kind,
    walletAddress: params.walletAddress,
    network: params.existing.network,
    transactionHash: params.existing.txHash,
    userOpHash:
      typeof params.existing.userOpHash === "string"
        ? (params.existing.userOpHash as `0x${string}`)
        : undefined,
    replayed: true,
  });
}

function isResumableUserOperationStatus(status: string): boolean {
  return status === CLI_TX_LOG_STATUSES.SUBMITTED || status === CLI_TX_LOG_STATUSES.TIMED_OUT;
}

async function resolveExistingCliTxLog(params: {
  db: CliExecDb;
  ownerAddress: `0x${string}`;
  agentKey: string;
  idempotencyKey: string;
  data: CliTxLogCreateData;
  existing: CliTxLogReplayRecord;
  walletAddress?: string;
  kind: "transfer" | "tx";
  assertMatch: (existing: CliTxLogReplayRecord) => void;
}): Promise<ReserveOrReplayResult> {
  params.assertMatch(params.existing);

  if (
    params.existing.status === CLI_TX_LOG_STATUSES.CONFIRMED &&
    typeof params.existing.txHash === "string"
  ) {
    return {
      response: buildReplayResponse({
        kind: params.kind,
        walletAddress: params.walletAddress,
        existing: params.existing,
      }),
    };
  }

  if (isResumableUserOperationStatus(params.existing.status)) {
    if (!params.existing.userOpHash) {
      throw new Error("Resumable idempotency record is missing userOpHash");
    }
    return {
      resumeUserOpHash: params.existing.userOpHash as `0x${string}`,
    };
  }

  if (
    params.existing.status === CLI_TX_LOG_STATUSES.PENDING &&
    !isReservationExpired(params.existing)
  ) {
    throw new IdempotencyConflictError(
      "Idempotency key reservation is still in progress; retry shortly"
    );
  }

  if (
    params.existing.status === CLI_TX_LOG_STATUSES.PENDING &&
    isReservationExpired(params.existing)
  ) {
    await expireCliTxLog({
      db: params.db,
      ownerAddress: params.ownerAddress,
      agentKey: params.agentKey,
      idempotencyKey: params.idempotencyKey,
    });
  }

  if (
    params.existing.status === CLI_TX_LOG_STATUSES.FAILED ||
    params.existing.status === CLI_TX_LOG_STATUSES.EXPIRED ||
    isReservationExpired(params.existing)
  ) {
    const reset = await resetCliTxLogReservation({
      db: params.db,
      ownerAddress: params.ownerAddress,
      agentKey: params.agentKey,
      idempotencyKey: params.idempotencyKey,
      existing: params.existing,
      data: params.data,
    });
    if (reset) {
      return { reserved: true };
    }

    const refreshed = await findCliTxLogByIdempotency({
      db: params.db,
      ownerAddress: params.ownerAddress,
      agentKey: params.agentKey,
      idempotencyKey: params.idempotencyKey,
    });
    if (!refreshed) {
      throw new Error("Failed to reload idempotency record after reset race");
    }

    return resolveExistingCliTxLog({
      ...params,
      existing: refreshed,
    });
  }

  throw new IdempotencyConflictError(
    "Idempotency key is already associated with a non-retryable request"
  );
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
  if (existing.status !== CLI_TX_LOG_STATUSES.CONFIRMED || typeof existing.txHash !== "string") {
    return null;
  }

  return buildReplayResponse({
    kind: params.kind,
    walletAddress: params.walletAddress,
    existing,
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
}): Promise<ReserveOrReplayResult> {
  if (!params.idempotencyKey) {
    return { reserved: true };
  }

  const existing = await findCliTxLogByIdempotency({
    db: params.db,
    ownerAddress: params.ownerAddress,
    agentKey: params.agentKey,
    idempotencyKey: params.idempotencyKey,
  });
  if (existing) {
    return await resolveExistingCliTxLog({
      ...params,
      idempotencyKey: params.idempotencyKey,
      existing,
    });
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

  return await resolveExistingCliTxLog({
    ...params,
    idempotencyKey: params.idempotencyKey,
    existing: raced,
  });
}
