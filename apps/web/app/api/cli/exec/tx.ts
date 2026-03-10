import { type NextResponse } from "next/server";
import { isAddress } from "viem";
import {
  baseBuilderCodeDataSuffixForNetwork,
  canonicalizeBaseBuilderCodeAttributedData,
  normalizeEvmAddress as normalizeAddress,
  normalizeHex,
} from "@cobuild/wire";
import { assertCliTxAllowed } from "@/lib/server/cli/policy";
import { RequestValidationError } from "@/lib/server/cli/http";
import {
  waitForUserOperationComplete,
  UserOperationTimeoutError,
} from "@/lib/server/cli/user-operation";
import { getOrCreateCliAgentExecutionContext } from "@/lib/server/cli/wallet-store";
import {
  assertTxIdempotencyMatch,
  failCliTxLog,
  finalizeCliTxLog,
  markCliTxSubmitted,
  replayIfFinalized,
  reserveOrReplay,
  type CliExecDb,
  type CliTxLogCreateData,
  writeCliTxLog,
} from "./idempotency";
import { buildPendingResponse, buildSuccessResponse, UserOperationFailedError } from "./response";
import { parseEtherInput, parseTxNetwork } from "./validation";

const CLI_EXEC_USER_OPERATION_WAIT_TIMEOUT_MS = 20_000;

type TxInput = {
  kind: "tx";
  network?: string;
  idempotencyKey?: string;
  agentKey?: string;
  to: string;
  valueEth: string;
  data: string;
};

export async function handleTxExecution(params: {
  db: CliExecDb;
  auth: { ownerAddress: `0x${string}`; agentKey: string };
  input: TxInput;
  requestedNetwork: string;
  idempotencyKey: string | null;
  walletAddress?: string;
}): Promise<NextResponse> {
  const network = parseTxNetwork(params.requestedNetwork);

  if (!isAddress(params.input.to)) {
    throw new RequestValidationError("Invalid transaction target address");
  }

  const to = normalizeAddress(params.input.to, "to");
  const valueEth = params.input.valueEth;
  const valueWei = parseEtherInput(valueEth, "valueEth");
  if (valueWei < 0n) {
    throw new RequestValidationError("valueEth must be greater than or equal to 0");
  }
  const requestData = normalizeHex(params.input.data as `0x${string}`);
  const canonicalTxData = canonicalizeBaseBuilderCodeAttributedData(requestData);
  const txLogData: CliTxLogCreateData = {
    ownerAddress: params.auth.ownerAddress,
    agentKey: params.auth.agentKey,
    idempotencyKey: params.idempotencyKey,
    kind: "tx",
    network,
    to,
    token: null,
    amount: null,
    decimals: null,
    valueEth,
    data: canonicalTxData,
    txHash: null,
  };

  const replayResponse = await replayIfFinalized({
    db: params.db,
    ownerAddress: params.auth.ownerAddress,
    agentKey: params.auth.agentKey,
    idempotencyKey: params.idempotencyKey,
    walletAddress: params.walletAddress,
    kind: "tx",
    assertMatch: (existing) => {
      assertTxIdempotencyMatch({
        existing,
        network,
        to,
        valueWei,
        data: canonicalTxData,
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
    data: canonicalTxData,
  });

  const reservation = await reserveOrReplay({
    db: params.db,
    ownerAddress: params.auth.ownerAddress,
    agentKey: params.auth.agentKey,
    idempotencyKey: params.idempotencyKey,
    data: txLogData,
    walletAddress: params.walletAddress,
    kind: "tx",
    assertMatch: (raced) => {
      assertTxIdempotencyMatch({
        existing: raced,
        network,
        to,
        valueWei,
        data: canonicalTxData,
      });
    },
  });
  if ("response" in reservation) {
    return reservation.response;
  }

  const { smartAccount, walletAddress } = await getOrCreateCliAgentExecutionContext({
    ownerAddress: params.auth.ownerAddress,
    agentKey: params.auth.agentKey,
    defaultNetwork: network,
  });
  let userOpHash: `0x${string}`;

  if ("resumeUserOpHash" in reservation) {
    userOpHash = reservation.resumeUserOpHash;
  } else {
    try {
      const dataSuffix = baseBuilderCodeDataSuffixForNetwork(network);
      const txResult = await smartAccount.sendUserOperation({
        network,
        calls: [{ to, value: valueWei, data: canonicalTxData }],
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
        });
      }
      throw error;
    }
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
      return buildPendingResponse({
        kind: "tx",
        walletAddress,
        network,
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
        ...txLogData,
        userOpHash,
        txHash: transactionHash,
      },
    });
  }

  return buildSuccessResponse({
    kind: "tx",
    walletAddress,
    network,
    transactionHash,
    userOpHash,
  });
}
