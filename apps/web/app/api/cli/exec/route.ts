import { NextResponse } from "next/server";
import { isAddress, parseEther, parseUnits } from "viem";
import { z } from "zod";
import prisma, { prismaPrimary } from "@/lib/server/db/cobuild-db-client";
import { requireCliBearerAuth } from "@/lib/server/cli/auth";
import { getCliExplorerTxUrl } from "@/lib/server/cli/explorer";
import {
  NO_STORE_HEADERS,
  RequestValidationError,
  cliErrorResponse,
  jsonError,
  parseJsonStrict,
} from "@/lib/server/cli/http";
import { IdempotencyKeySchema, resolveIdempotencyKey } from "@/lib/server/cli/idempotency";
import { assertCliTransferAllowed, assertCliTxAllowed } from "@/lib/server/cli/policy";
import { isPrismaUniqueViolation } from "@/lib/server/cli/prisma-errors";
import { waitForUserOperationComplete } from "@/lib/server/cli/user-operation";
import {
  getOrCreateCliAgentSmartAccount,
  getOrCreateCliAgentWallet,
} from "@/lib/server/cli/wallet-store";
import { normalizeAddress } from "@/lib/shared/address";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

class IdempotencyConflictError extends Error {}

class UserOperationFailedError extends Error {}

const ExecRequestBaseSchema = z.object({
  network: z.string().trim().min(1).max(64).optional(),
  idempotencyKey: IdempotencyKeySchema.optional(),
  agentKey: z.string().trim().min(1).max(64).optional(),
});

const ExecRequestSchema = z.discriminatedUnion("kind", [
  ExecRequestBaseSchema.extend({
    kind: z.literal("transfer"),
    to: z.string().trim().min(1),
    token: z.string().trim().min(1),
    amount: z.string().trim().min(1),
    decimals: z.number().int().min(0).max(255).optional(),
  }),
  ExecRequestBaseSchema.extend({
    kind: z.literal("tx"),
    to: z.string().trim().min(1),
    valueEth: z.string().trim().default("0"),
    data: z.string().regex(/^0x([0-9a-fA-F]{2})*$/),
  }),
]);

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

type CliTxLogReplayRecord = {
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

type CliExecDb = {
  cliTxLog: {
    findUnique: typeof prisma.cliTxLog.findUnique;
    create: typeof prisma.cliTxLog.create;
    update: typeof prisma.cliTxLog.update;
  };
};

type CliTxLogCreateData = Parameters<typeof prisma.cliTxLog.create>[0]["data"];

const CLI_EXEC_NETWORKS = ["base", "base-sepolia"] as const;

const TransferNetworkSchema = z.enum(CLI_EXEC_NETWORKS);
const TxNetworkSchema = z.enum(CLI_EXEC_NETWORKS);

function cliExecPrimaryDb(): CliExecDb {
  return prismaPrimary(prisma) as CliExecDb;
}

function execErrorResponse(error: unknown) {
  if (error instanceof IdempotencyConflictError) {
    return jsonError(409, error.message);
  }

  if (error instanceof UserOperationFailedError) {
    return jsonError(500, error.message);
  }
  return null;
}

function parseEtherInput(value: string, fieldName: string): bigint {
  try {
    return parseEther(value);
  } catch {
    throw new RequestValidationError(`${fieldName} must be a valid decimal amount`);
  }
}

function parseUnitsInput(value: string, decimals: number, fieldName: string): bigint {
  try {
    return parseUnits(value, decimals);
  } catch {
    throw new RequestValidationError(`${fieldName} must be a valid decimal amount`);
  }
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

async function finalizeCliTxLog(params: {
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

async function writeCliTxLog(params: { db: CliExecDb; data: CliTxLogCreateData }) {
  try {
    await params.db.cliTxLog.create({
      data: params.data,
    });
  } catch (error) {
    console.error("[cli][exec] failed to persist tx log", error);
  }
}

function assertTransferIdempotencyMatch(params: {
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

function assertTxIdempotencyMatch(params: {
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

function buildSuccessResponse(params: {
  kind: "transfer" | "tx";
  walletAddress: string;
  network: string;
  transactionHash: string | null;
  replayed?: boolean;
}) {
  return NextResponse.json(
    {
      ok: true,
      kind: params.kind,
      ...(params.replayed ? { replayed: true } : {}),
      wallet: {
        address: params.walletAddress,
      },
      transactionHash: params.transactionHash,
      explorerUrl: getCliExplorerTxUrl(params.network, params.transactionHash),
    },
    { headers: NO_STORE_HEADERS }
  );
}

function parseNetwork<TNetwork extends string>(
  network: string,
  schema: z.ZodType<TNetwork>,
  kind: "transfer" | "transaction"
): TNetwork {
  const parsed = schema.safeParse(network);
  if (!parsed.success) {
    throw new RequestValidationError(`Unsupported ${kind} network: ${network}`);
  }

  return parsed.data;
}

function parseTransferNetwork(network: string): (typeof CLI_EXEC_NETWORKS)[number] {
  return parseNetwork(network, TransferNetworkSchema, "transfer");
}

function parseTxNetwork(network: string): (typeof CLI_EXEC_NETWORKS)[number] {
  return parseNetwork(network, TxNetworkSchema, "transaction");
}

function assertAgentScopeMatch(requestAgentKey: string | undefined, authAgentKey: string): void {
  if (requestAgentKey && requestAgentKey !== authAgentKey) {
    throw new RequestValidationError("agentKey does not match token scope");
  }
}

async function replayIfFinalized(params: {
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

async function reserveOrReplay(params: {
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

export async function POST(request: Request) {
  try {
    const auth = await requireCliBearerAuth(request, {
      requiredScopes: ["wallet:execute"],
    });
    const input = ExecRequestSchema.parse(await parseJsonStrict(request));
    assertAgentScopeMatch(input.agentKey, auth.agentKey);
    const idempotencyKey = resolveIdempotencyKey(request, input.idempotencyKey);
    const db = cliExecPrimaryDb();

    const wallet = await getOrCreateCliAgentWallet({
      ownerAddress: auth.ownerAddress,
      agentKey: auth.agentKey,
    });
    const requestedNetwork = input.network ?? wallet.defaultNetwork;
    const walletAddress =
      typeof wallet.address === "string" && wallet.address.length > 0
        ? normalizeAddress(wallet.address)
        : undefined;

    if (input.kind === "transfer") {
      const network = parseTransferNetwork(requestedNetwork);

      if (!isAddress(input.to)) {
        throw new RequestValidationError("Invalid recipient address");
      }

      const to = normalizeAddress(input.to);
      const tokenLower = input.token.toLowerCase();

      let amountAtomic: bigint;
      let token: "eth" | "usdc" | `0x${string}`;

      if (tokenLower === "eth") {
        amountAtomic = parseEtherInput(input.amount, "amount");
        token = "eth";
      } else if (tokenLower === "usdc") {
        amountAtomic = parseUnitsInput(input.amount, 6, "amount");
        token = "usdc";
      } else {
        if (!isAddress(input.token)) {
          throw new RequestValidationError(
            "token must be 'eth', 'usdc', or an ERC-20 contract address"
          );
        }
        if (typeof input.decimals !== "number") {
          throw new RequestValidationError(
            "decimals is required when token is an ERC-20 contract address"
          );
        }

        token = normalizeAddress(input.token);
        amountAtomic = parseUnitsInput(input.amount, input.decimals, "amount");
      }

      if (amountAtomic <= 0n) {
        throw new RequestValidationError("amount must be greater than 0");
      }
      const decimals = input.decimals ?? null;
      const transferLogData: CliTxLogCreateData = {
        ownerAddress: auth.ownerAddress,
        agentKey: auth.agentKey,
        idempotencyKey,
        kind: "transfer",
        network,
        to,
        token,
        amount: input.amount,
        decimals,
        valueEth: null,
        data: null,
        txHash: null,
      };

      const replayResponse = await replayIfFinalized({
        db,
        ownerAddress: auth.ownerAddress,
        agentKey: auth.agentKey,
        idempotencyKey,
        walletAddress,
        kind: "transfer",
        assertMatch: (existing) => {
          assertTransferIdempotencyMatch({
            existing,
            network,
            to,
            token,
            amount: input.amount,
            decimals,
          });
        },
      });
      if (replayResponse) {
        return replayResponse;
      }

      assertCliTransferAllowed({
        network,
        to,
        token,
        amountAtomic,
      });

      const reservation = await reserveOrReplay({
        db,
        ownerAddress: auth.ownerAddress,
        agentKey: auth.agentKey,
        idempotencyKey,
        data: transferLogData,
        walletAddress,
        kind: "transfer",
        assertMatch: (raced) => {
          assertTransferIdempotencyMatch({
            existing: raced,
            network,
            to,
            token,
            amount: input.amount,
            decimals,
          });
        },
      });
      if ("response" in reservation) {
        return reservation.response;
      }

      const smartAccount = await getOrCreateCliAgentSmartAccount({
        ownerAddress: auth.ownerAddress,
        agentKey: auth.agentKey,
      });
      const transferResult = await smartAccount.transfer({
        to,
        amount: amountAtomic,
        token,
        network,
      });
      const transactionHash = await waitForUserOperationComplete({
        smartAccount,
        userOpHash: transferResult.userOpHash,
        label: "User operation",
        createError: (message) => new UserOperationFailedError(message),
      });

      if (idempotencyKey) {
        await finalizeCliTxLog({
          db,
          ownerAddress: auth.ownerAddress,
          agentKey: auth.agentKey,
          idempotencyKey,
          txHash: transactionHash,
        });
      } else {
        await writeCliTxLog({
          db,
          data: {
            ...transferLogData,
            txHash: transactionHash,
          },
        });
      }

      return buildSuccessResponse({
        kind: "transfer",
        walletAddress: normalizeAddress(smartAccount.address),
        network,
        transactionHash,
      });
    }

    const network = parseTxNetwork(requestedNetwork);

    if (!isAddress(input.to)) {
      throw new RequestValidationError("Invalid transaction target address");
    }

    const to = normalizeAddress(input.to);
    const valueEth = input.valueEth;
    const valueWei = parseEtherInput(valueEth, "valueEth");
    if (valueWei < 0n) {
      throw new RequestValidationError("valueEth must be greater than or equal to 0");
    }
    const data = input.data as `0x${string}`;
    const txLogData: CliTxLogCreateData = {
      ownerAddress: auth.ownerAddress,
      agentKey: auth.agentKey,
      idempotencyKey,
      kind: "tx",
      network,
      to,
      token: null,
      amount: null,
      decimals: null,
      valueEth,
      data,
      txHash: null,
    };

    const replayResponse = await replayIfFinalized({
      db,
      ownerAddress: auth.ownerAddress,
      agentKey: auth.agentKey,
      idempotencyKey,
      walletAddress,
      kind: "tx",
      assertMatch: (existing) => {
        assertTxIdempotencyMatch({
          existing,
          network,
          to,
          valueWei,
          data,
        });
      },
    });
    if (replayResponse) {
      return replayResponse;
    }

    assertCliTxAllowed({
      network,
      to,
      valueWei,
      data,
    });

    const reservation = await reserveOrReplay({
      db,
      ownerAddress: auth.ownerAddress,
      agentKey: auth.agentKey,
      idempotencyKey,
      data: txLogData,
      walletAddress,
      kind: "tx",
      assertMatch: (raced) => {
        assertTxIdempotencyMatch({
          existing: raced,
          network,
          to,
          valueWei,
          data,
        });
      },
    });
    if ("response" in reservation) {
      return reservation.response;
    }

    const smartAccount = await getOrCreateCliAgentSmartAccount({
      ownerAddress: auth.ownerAddress,
      agentKey: auth.agentKey,
    });
    const txResult = await smartAccount.sendUserOperation({
      network,
      calls: [{ to, value: valueWei, data }],
      idempotencyKey: idempotencyKey ?? undefined,
    });
    const transactionHash = await waitForUserOperationComplete({
      smartAccount,
      userOpHash: txResult.userOpHash,
      label: "User operation",
      createError: (message) => new UserOperationFailedError(message),
    });

    if (idempotencyKey) {
      await finalizeCliTxLog({
        db,
        ownerAddress: auth.ownerAddress,
        agentKey: auth.agentKey,
        idempotencyKey,
        txHash: transactionHash,
      });
    } else {
      await writeCliTxLog({
        db,
        data: {
          ...txLogData,
          txHash: transactionHash,
        },
      });
    }

    return buildSuccessResponse({
      kind: "tx",
      walletAddress: normalizeAddress(smartAccount.address),
      network,
      transactionHash,
    });
  } catch (error) {
    return cliErrorResponse(error, {
      tag: "exec",
      extraHandlers: [execErrorResponse],
    });
  }
}
