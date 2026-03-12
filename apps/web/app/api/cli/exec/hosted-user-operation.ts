import { type NextResponse } from "next/server";
import { baseBuilderCodeDataSuffixForNetwork } from "@cobuild/wire";
import {
  waitForUserOperationComplete,
  UserOperationTimeoutError,
} from "@/lib/server/cli/user-operation";
import type { ResolvedCliExecWalletContext } from "@/lib/server/cli/wallet-store";
import {
  failCliTxLog,
  finalizeCliTxLog,
  markCliTxSubmitted,
  markCliTxTimedOut,
  replayIfFinalized,
  reserveOrReplay,
  type CliExecDb,
  type CliTxLogCreateData,
  type CliTxLogReplayRecord,
  writeCliTxLog,
} from "./idempotency";
import {
  buildPendingResponse,
  buildSuccessResponse,
  UserOperationFailedError,
  type CliExecResponseKind,
} from "./response";
import type { CliExecNetwork } from "./validation";

const CLI_EXEC_USER_OPERATION_WAIT_TIMEOUT_MS = 20_000;

type HostedCliUserOperationCall = {
  to: `0x${string}`;
  value: bigint;
  data: `0x${string}`;
};

type HostedCliUserOperationKind = Exclude<CliExecResponseKind, "transfer">;

export async function executeHostedCliUserOperation(params: {
  db: CliExecDb;
  auth: { ownerAddress: `0x${string}`; agentKey: string };
  walletContext: ResolvedCliExecWalletContext;
  idempotencyKey: string | null;
  kind: HostedCliUserOperationKind;
  network: CliExecNetwork;
  txLogData: CliTxLogCreateData;
  calls: readonly HostedCliUserOperationCall[];
  assertMatch: (existing: CliTxLogReplayRecord) => void;
  skipReplayIfFinalized?: boolean;
}): Promise<NextResponse> {
  if (!params.skipReplayIfFinalized) {
    const replayResponse = await replayIfFinalized({
      db: params.db,
      ownerAddress: params.auth.ownerAddress,
      agentKey: params.auth.agentKey,
      idempotencyKey: params.idempotencyKey,
      walletAddress: params.walletContext.walletAddress,
      kind: params.kind,
      assertMatch: params.assertMatch,
    });
    if (replayResponse) {
      return replayResponse;
    }
  }

  const reservation = await reserveOrReplay({
    db: params.db,
    ownerAddress: params.auth.ownerAddress,
    agentKey: params.auth.agentKey,
    idempotencyKey: params.idempotencyKey,
    data: params.txLogData,
    walletAddress: params.walletContext.walletAddress,
    kind: params.kind,
    assertMatch: params.assertMatch,
  });
  if ("response" in reservation) {
    return reservation.response;
  }

  const { smartAccount, walletAddress } = await params.walletContext.getExecutionContext();
  let userOpHash: `0x${string}` | null = null;

  if ("resumeUserOpHash" in reservation) {
    userOpHash = reservation.resumeUserOpHash;
  } else {
    try {
      const dataSuffix = baseBuilderCodeDataSuffixForNetwork(params.network);
      const txResult = await smartAccount.sendUserOperation({
        network: params.network,
        calls: [...params.calls],
        ...(dataSuffix ? { dataSuffix } : {}),
        idempotencyKey: params.idempotencyKey ?? undefined,
      });
      userOpHash = txResult.userOpHash;
      if (params.idempotencyKey) {
        await markCliTxSubmitted({
          db: params.db,
          ownerAddress: params.auth.ownerAddress,
          agentKey: params.auth.agentKey,
          idempotencyKey: params.idempotencyKey,
          userOpHash,
        });
      }
    } catch (error) {
      if (params.idempotencyKey) {
        await failCliTxLog({
          db: params.db,
          ownerAddress: params.auth.ownerAddress,
          agentKey: params.auth.agentKey,
          idempotencyKey: params.idempotencyKey,
          ...(userOpHash ? { userOpHash } : {}),
        });
      }
      throw error;
    }
  }

  if (!userOpHash) {
    throw new Error("Missing userOpHash after hosted user operation submission");
  }

  let transactionHash: `0x${string}` | null;
  try {
    transactionHash = await waitForUserOperationComplete({
      smartAccount,
      userOpHash,
      label: "User operation",
      createError: (message) => new UserOperationFailedError(message),
      timeoutMs: CLI_EXEC_USER_OPERATION_WAIT_TIMEOUT_MS,
    });
  } catch (error) {
    if (error instanceof UserOperationTimeoutError) {
      if (params.idempotencyKey) {
        await markCliTxTimedOut({
          db: params.db,
          ownerAddress: params.auth.ownerAddress,
          agentKey: params.auth.agentKey,
          idempotencyKey: params.idempotencyKey,
          userOpHash,
        });
      }
      return buildPendingResponse({
        kind: params.kind,
        walletAddress,
        network: params.network,
        userOpHash,
        replayed: "resumeUserOpHash" in reservation,
      });
    }
    if (params.idempotencyKey) {
      await failCliTxLog({
        db: params.db,
        ownerAddress: params.auth.ownerAddress,
        agentKey: params.auth.agentKey,
        idempotencyKey: params.idempotencyKey,
      });
    }
    throw error;
  }

  if (params.idempotencyKey) {
    await finalizeCliTxLog({
      db: params.db,
      ownerAddress: params.auth.ownerAddress,
      agentKey: params.auth.agentKey,
      idempotencyKey: params.idempotencyKey,
      txHash: transactionHash,
      userOpHash,
    });
  } else {
    await writeCliTxLog({
      db: params.db,
      data: {
        ...params.txLogData,
        userOpHash,
        txHash: transactionHash,
      },
    });
  }

  return buildSuccessResponse({
    kind: params.kind,
    walletAddress,
    network: params.network,
    transactionHash,
    userOpHash,
  });
}
