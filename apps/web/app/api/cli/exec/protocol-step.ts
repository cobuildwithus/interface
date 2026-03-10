import { type NextResponse } from "next/server";
import {
  baseBuilderCodeDataSuffixForNetwork,
  buildCliProtocolStepLogKind,
  type CliProtocolStepRequest,
  validateCliProtocolStepRequest,
} from "@cobuild/wire";
import { assertCliProtocolStepAllowed } from "@/lib/server/cli/policy";
import { RequestValidationError } from "@/lib/server/cli/http";
import {
  waitForUserOperationComplete,
  UserOperationTimeoutError,
} from "@/lib/server/cli/user-operation";
import { resolveCliExecWalletContext } from "@/lib/server/cli/wallet-store";
import {
  assertProtocolStepIdempotencyMatch,
  failCliTxLog,
  finalizeCliTxLog,
  markCliTxSubmitted,
  markCliTxTimedOut,
  replayIfFinalized,
  reserveOrReplay,
  type CliExecDb,
  type CliTxLogCreateData,
  writeCliTxLog,
} from "./idempotency";
import { buildPendingResponse, buildSuccessResponse, UserOperationFailedError } from "./response";
import { parseEtherInput, parseTxNetwork } from "./validation";

const CLI_EXEC_USER_OPERATION_WAIT_TIMEOUT_MS = 20_000;

type ProtocolStepInput = {
  kind: "protocol-step";
  network?: string;
  idempotencyKey?: string;
  agentKey?: string;
  action: string;
  riskClass: string;
  step: unknown;
};

function validateProtocolRequest(params: {
  input: ProtocolStepInput;
  requestedNetwork: string;
}): CliProtocolStepRequest {
  try {
    return validateCliProtocolStepRequest({
      kind: "protocol-step",
      network: params.input.network ?? params.requestedNetwork,
      action: params.input.action,
      riskClass: params.input.riskClass,
      step: params.input.step,
    });
  } catch (error) {
    throw new RequestValidationError(error instanceof Error ? error.message : String(error));
  }
}

export async function handleProtocolStepExecution(params: {
  db: CliExecDb;
  auth: { ownerAddress: `0x${string}`; agentKey: string };
  input: ProtocolStepInput;
  idempotencyKey: string | null;
}): Promise<NextResponse> {
  const walletContext = await resolveCliExecWalletContext({
    ownerAddress: params.auth.ownerAddress,
    agentKey: params.auth.agentKey,
    requestedNetwork: params.input.network,
  });
  const protocolRequest = validateProtocolRequest({
    input: params.input,
    requestedNetwork: walletContext.requestedNetwork,
  });
  assertCliProtocolStepAllowed(protocolRequest);

  const network = parseTxNetwork(protocolRequest.network);
  const { step } = protocolRequest;
  const to = step.transaction.to;
  const valueEth = step.transaction.valueEth;
  const valueWei = parseEtherInput(valueEth, "step.transaction.valueEth");
  const logKind = buildCliProtocolStepLogKind(protocolRequest.action);
  const txLogData: CliTxLogCreateData = {
    ownerAddress: params.auth.ownerAddress,
    agentKey: params.auth.agentKey,
    idempotencyKey: params.idempotencyKey,
    kind: logKind,
    network,
    to,
    token: null,
    amount: null,
    decimals: null,
    valueEth,
    data: step.transaction.data,
    txHash: null,
  };

  const replayResponse = await replayIfFinalized({
    db: params.db,
    ownerAddress: params.auth.ownerAddress,
    agentKey: params.auth.agentKey,
    idempotencyKey: params.idempotencyKey,
    walletAddress: walletContext.walletAddress,
    kind: "protocol-step",
    assertMatch: (existing) => {
      assertProtocolStepIdempotencyMatch({
        existing,
        logKind,
        network,
        to,
        valueWei,
        data: step.transaction.data,
      });
    },
  });
  if (replayResponse) {
    return replayResponse;
  }

  const reservation = await reserveOrReplay({
    db: params.db,
    ownerAddress: params.auth.ownerAddress,
    agentKey: params.auth.agentKey,
    idempotencyKey: params.idempotencyKey,
    data: txLogData,
    walletAddress: walletContext.walletAddress,
    kind: "protocol-step",
    assertMatch: (raced) => {
      assertProtocolStepIdempotencyMatch({
        existing: raced,
        logKind,
        network,
        to,
        valueWei,
        data: step.transaction.data,
      });
    },
  });
  if ("response" in reservation) {
    return reservation.response;
  }

  const { smartAccount, walletAddress } = await walletContext.getExecutionContext();
  let userOpHash: `0x${string}`;

  if ("resumeUserOpHash" in reservation) {
    userOpHash = reservation.resumeUserOpHash;
  } else {
    try {
      const dataSuffix = baseBuilderCodeDataSuffixForNetwork(network);
      const txResult = await smartAccount.sendUserOperation({
        network,
        calls: [{ to, value: valueWei, data: step.transaction.data }],
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
        kind: "protocol-step",
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
    kind: "protocol-step",
    walletAddress,
    network,
    transactionHash,
    userOpHash,
  });
}
