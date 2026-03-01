import type { EvmSmartAccount } from "@coinbase/cdp-sdk";
import { NextResponse } from "next/server";
import { isAddress, parseEther, parseUnits } from "viem";
import { z } from "zod";
import prisma from "@/lib/server/db/cobuild-db-client";
import { requireBuildBotBearerAuth } from "@/lib/server/build-bot/auth";
import {
  BuildBotAuthError,
  BuildBotConfigError,
  BuildBotPolicyError,
} from "@/lib/server/build-bot/errors";
import { getBuildBotExplorerTxUrl } from "@/lib/server/build-bot/explorer";
import {
  assertBuildBotTransferAllowed,
  assertBuildBotTxAllowed,
} from "@/lib/server/build-bot/policy";
import {
  getOrCreateBuildBotAgentSmartAccount,
  getOrCreateBuildBotAgentWallet,
} from "@/lib/server/build-bot/wallet-store";
import { normalizeAddress } from "@/lib/shared/address";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

class RequestValidationError extends Error {}

class IdempotencyConflictError extends Error {}

class UserOperationFailedError extends Error {}

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
} as const;

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const IdempotencyKeyValueSchema = z
  .string()
  .trim()
  .regex(UUID_V4_REGEX, "idempotencyKey must be a UUID v4");

const IdempotencyKeySchema = IdempotencyKeyValueSchema.optional();

const ExecRequestSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("transfer"),
    network: z.string().trim().min(1).max(64).optional(),
    idempotencyKey: IdempotencyKeySchema.optional(),
    to: z.string().trim().min(1),
    token: z.string().trim().min(1),
    amount: z.string().trim().min(1),
    decimals: z.number().int().min(0).max(255).optional(),
  }),
  z.object({
    kind: z.literal("tx"),
    network: z.string().trim().min(1).max(64).optional(),
    idempotencyKey: IdempotencyKeySchema.optional(),
    to: z.string().trim().min(1),
    valueEth: z.string().trim().default("0"),
    data: z.string().regex(/^0x([0-9a-fA-F]{2})*$/),
  }),
]);

const BUILD_BOT_TX_LOG_REPLAY_SELECT = {
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

type BuildBotTxLogReplayRecord = {
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

type BuildBotExecDb = {
  buildBotTxLog: {
    findUnique: typeof prisma.buildBotTxLog.findUnique;
    create: typeof prisma.buildBotTxLog.create;
    update: typeof prisma.buildBotTxLog.update;
  };
};

type BuildBotTxLogCreateData = Parameters<typeof prisma.buildBotTxLog.create>[0]["data"];

const TRANSFER_NETWORKS = ["base", "base-sepolia"] as const;

const TX_NETWORKS = ["base", "base-sepolia"] as const;

const TransferNetworkSchema = z.enum(TRANSFER_NETWORKS);
const TxNetworkSchema = z.enum(TX_NETWORKS);

function buildBotExecPrimaryDb(): BuildBotExecDb {
  const withPrimary = prisma as typeof prisma & {
    $primary?: () => BuildBotExecDb;
  };
  return typeof withPrimary.$primary === "function"
    ? withPrimary.$primary()
    : (prisma as BuildBotExecDb);
}

function isPrismaUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

function toErrorResponse(error: unknown) {
  if (error instanceof BuildBotAuthError) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: error.status, headers: NO_STORE_HEADERS }
    );
  }

  if (error instanceof BuildBotConfigError) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }

  if (error instanceof BuildBotPolicyError) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 403, headers: NO_STORE_HEADERS }
    );
  }

  if (error instanceof IdempotencyConflictError) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 409, headers: NO_STORE_HEADERS }
    );
  }

  if (error instanceof RequestValidationError) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  if (error instanceof UserOperationFailedError) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }

  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid request body",
        details: z.flattenError(error),
      },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  console.error("[build-bot][exec] unexpected error", error);
  return NextResponse.json(
    { ok: false, error: "Internal error" },
    { status: 500, headers: NO_STORE_HEADERS }
  );
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

function parseIdempotencyKeyHeader(request: Request): string | null {
  const headerValue =
    request.headers.get("x-idempotency-key")?.trim() ??
    request.headers.get("idempotency-key")?.trim();
  if (!headerValue) return null;

  const parsedHeader = IdempotencyKeyValueSchema.safeParse(headerValue);
  if (!parsedHeader.success) {
    throw new RequestValidationError("Idempotency-Key header must be a UUID v4");
  }

  return parsedHeader.data;
}

function resolveIdempotencyKey(request: Request, bodyIdempotencyKey?: string): string | null {
  const headerKey = parseIdempotencyKeyHeader(request);
  const bodyKey = bodyIdempotencyKey?.trim() || null;

  if (headerKey && bodyKey && headerKey !== bodyKey) {
    throw new RequestValidationError(
      "Idempotency-Key header and body idempotencyKey must match when both are provided"
    );
  }

  return headerKey ?? bodyKey;
}

async function parseJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new RequestValidationError("Invalid JSON body");
  }
}

async function findBuildBotTxLogByIdempotency(params: {
  db: BuildBotExecDb;
  ownerAddress: `0x${string}`;
  agentKey: string;
  idempotencyKey: string | null;
}): Promise<BuildBotTxLogReplayRecord | null> {
  if (!params.idempotencyKey) return null;

  return params.db.buildBotTxLog.findUnique({
    where: {
      ownerAddress_agentKey_idempotencyKey: {
        ownerAddress: params.ownerAddress,
        agentKey: params.agentKey,
        idempotencyKey: params.idempotencyKey,
      },
    },
    select: BUILD_BOT_TX_LOG_REPLAY_SELECT,
  });
}

async function tryReserveBuildBotTxLog(params: {
  db: BuildBotExecDb;
  data: BuildBotTxLogCreateData;
}): Promise<boolean> {
  try {
    await params.db.buildBotTxLog.create({
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

async function finalizeBuildBotTxLog(params: {
  db: BuildBotExecDb;
  ownerAddress: `0x${string}`;
  agentKey: string;
  idempotencyKey: string;
  txHash: string | null;
}) {
  await params.db.buildBotTxLog.update({
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

async function writeBuildBotTxLog(params: { db: BuildBotExecDb; data: BuildBotTxLogCreateData }) {
  try {
    await params.db.buildBotTxLog.create({
      data: params.data,
    });
  } catch (error) {
    console.error("[build-bot][exec] failed to persist tx log", error);
  }
}

function assertTransferIdempotencyMatch(params: {
  existing: BuildBotTxLogReplayRecord;
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
  existing: BuildBotTxLogReplayRecord;
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

function assertIdempotencyFinalized(existing: BuildBotTxLogReplayRecord) {
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
      explorerUrl: getBuildBotExplorerTxUrl(params.network, params.transactionHash),
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

function parseTransferNetwork(network: string): (typeof TRANSFER_NETWORKS)[number] {
  return parseNetwork(network, TransferNetworkSchema, "transfer");
}

function parseTxNetwork(network: string): (typeof TX_NETWORKS)[number] {
  return parseNetwork(network, TxNetworkSchema, "transaction");
}

async function waitForBuildBotUserOperation(params: {
  smartAccount: EvmSmartAccount;
  userOpHash: `0x${string}`;
}) {
  const settled = await params.smartAccount.waitForUserOperation({
    userOpHash: params.userOpHash,
  });
  if (settled.status !== "complete") {
    throw new UserOperationFailedError("User operation failed before confirmation");
  }
  return settled.transactionHash;
}

export async function POST(request: Request) {
  try {
    const auth = await requireBuildBotBearerAuth(request);
    const input = ExecRequestSchema.parse(await parseJson(request));
    const idempotencyKey = resolveIdempotencyKey(request, input.idempotencyKey);
    const db = buildBotExecPrimaryDb();

    const wallet = await getOrCreateBuildBotAgentWallet({
      ownerAddress: auth.ownerAddress,
      agentKey: auth.agentKey,
    });
    const requestedNetwork = input.network ?? wallet.defaultNetwork;

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
      const transferLogData: BuildBotTxLogCreateData = {
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

      if (idempotencyKey) {
        const existing = await findBuildBotTxLogByIdempotency({
          db,
          ownerAddress: auth.ownerAddress,
          agentKey: auth.agentKey,
          idempotencyKey,
        });
        if (existing) {
          assertTransferIdempotencyMatch({
            existing,
            network,
            to,
            token,
            amount: input.amount,
            decimals,
          });
          assertIdempotencyFinalized(existing);

          return buildSuccessResponse({
            kind: "transfer",
            walletAddress: normalizeAddress(wallet.address),
            network: existing.network,
            transactionHash: existing.txHash,
            replayed: true,
          });
        }
      }

      assertBuildBotTransferAllowed({
        network,
        to,
        token,
        amountAtomic,
      });

      if (idempotencyKey) {
        const reserved = await tryReserveBuildBotTxLog({
          db,
          data: transferLogData,
        });
        if (!reserved) {
          const raced = await findBuildBotTxLogByIdempotency({
            db,
            ownerAddress: auth.ownerAddress,
            agentKey: auth.agentKey,
            idempotencyKey,
          });
          if (!raced) {
            throw new Error("Failed to read idempotency reservation after unique violation");
          }
          assertTransferIdempotencyMatch({
            existing: raced,
            network,
            to,
            token,
            amount: input.amount,
            decimals,
          });
          assertIdempotencyFinalized(raced);

          return buildSuccessResponse({
            kind: "transfer",
            walletAddress: normalizeAddress(wallet.address),
            network: raced.network,
            transactionHash: raced.txHash,
            replayed: true,
          });
        }
      }

      const smartAccount = await getOrCreateBuildBotAgentSmartAccount({
        ownerAddress: auth.ownerAddress,
        agentKey: auth.agentKey,
      });
      const transferResult = await smartAccount.transfer({
        to,
        amount: amountAtomic,
        token,
        network,
      });
      const transactionHash = await waitForBuildBotUserOperation({
        smartAccount,
        userOpHash: transferResult.userOpHash,
      });

      if (idempotencyKey) {
        await finalizeBuildBotTxLog({
          db,
          ownerAddress: auth.ownerAddress,
          agentKey: auth.agentKey,
          idempotencyKey,
          txHash: transactionHash,
        });
      } else {
        await writeBuildBotTxLog({
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
    const txLogData: BuildBotTxLogCreateData = {
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

    if (idempotencyKey) {
      const existing = await findBuildBotTxLogByIdempotency({
        db,
        ownerAddress: auth.ownerAddress,
        agentKey: auth.agentKey,
        idempotencyKey,
      });
      if (existing) {
        assertTxIdempotencyMatch({
          existing,
          network,
          to,
          valueWei,
          data,
        });
        assertIdempotencyFinalized(existing);

        return buildSuccessResponse({
          kind: "tx",
          walletAddress: normalizeAddress(wallet.address),
          network: existing.network,
          transactionHash: existing.txHash,
          replayed: true,
        });
      }
    }

    assertBuildBotTxAllowed({
      network,
      to,
      valueWei,
      data,
    });

    if (idempotencyKey) {
      const reserved = await tryReserveBuildBotTxLog({
        db,
        data: txLogData,
      });
      if (!reserved) {
        const raced = await findBuildBotTxLogByIdempotency({
          db,
          ownerAddress: auth.ownerAddress,
          agentKey: auth.agentKey,
          idempotencyKey,
        });
        if (!raced) {
          throw new Error("Failed to read idempotency reservation after unique violation");
        }
        assertTxIdempotencyMatch({
          existing: raced,
          network,
          to,
          valueWei,
          data,
        });
        assertIdempotencyFinalized(raced);

        return buildSuccessResponse({
          kind: "tx",
          walletAddress: normalizeAddress(wallet.address),
          network: raced.network,
          transactionHash: raced.txHash,
          replayed: true,
        });
      }
    }

    const smartAccount = await getOrCreateBuildBotAgentSmartAccount({
      ownerAddress: auth.ownerAddress,
      agentKey: auth.agentKey,
    });
    const txResult = await smartAccount.sendUserOperation({
      network,
      calls: [{ to, value: valueWei, data }],
      idempotencyKey: idempotencyKey ?? undefined,
    });
    const transactionHash = await waitForBuildBotUserOperation({
      smartAccount,
      userOpHash: txResult.userOpHash,
    });

    if (idempotencyKey) {
      await finalizeBuildBotTxLog({
        db,
        ownerAddress: auth.ownerAddress,
        agentKey: auth.agentKey,
        idempotencyKey,
        txHash: transactionHash,
      });
    } else {
      await writeBuildBotTxLog({
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
    return toErrorResponse(error);
  }
}
