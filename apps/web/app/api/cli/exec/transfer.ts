import { type NextResponse } from "next/server";
import { encodeFunctionData, erc20Abi } from "viem";
import { baseBuilderCodeDataSuffixForNetwork, usdcContractForNetwork } from "@cobuild/wire";
import { assertCliTransferAllowed } from "@/lib/server/cli/policy";
import { RequestValidationError } from "@/lib/server/cli/http";
import {
  waitForUserOperationComplete,
  UserOperationTimeoutError,
} from "@/lib/server/cli/user-operation";
import { resolveCliExecWalletContext } from "@/lib/server/cli/wallet-store";
import {
  assertTransferIdempotencyMatch,
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
import {
  parseEtherInput,
  parseEvmAddressInput,
  parseTransferNetwork,
  parseUnitsInput,
} from "./validation";

const CLI_EXEC_USER_OPERATION_WAIT_TIMEOUT_MS = 20_000;

type TransferInput = {
  kind: "transfer";
  network?: string;
  idempotencyKey?: string;
  agentKey?: string;
  to: string;
  token: string;
  amount: string;
  decimals?: number;
};

export async function handleTransferExecution(params: {
  db: CliExecDb;
  auth: { ownerAddress: `0x${string}`; agentKey: string };
  input: TransferInput;
  idempotencyKey: string | null;
}): Promise<NextResponse> {
  const to = parseEvmAddressInput(params.input.to, "to", "Invalid recipient address");
  const tokenLower = params.input.token.toLowerCase();

  let amountAtomic: bigint;
  let token: "eth" | "usdc" | `0x${string}`;

  if (tokenLower === "eth") {
    amountAtomic = parseEtherInput(params.input.amount, "amount");
    token = "eth";
  } else if (tokenLower === "usdc") {
    amountAtomic = parseUnitsInput(params.input.amount, 6, "amount");
    token = "usdc";
  } else {
    if (typeof params.input.decimals !== "number") {
      throw new RequestValidationError(
        "decimals is required when token is an ERC-20 contract address"
      );
    }

    token = parseEvmAddressInput(
      params.input.token,
      "token",
      "token must be 'eth', 'usdc', or an ERC-20 contract address"
    );
    amountAtomic = parseUnitsInput(params.input.amount, params.input.decimals, "amount");
  }

  if (amountAtomic <= 0n) {
    throw new RequestValidationError("amount must be greater than 0");
  }
  const decimals = params.input.decimals ?? null;
  const walletContext = await resolveCliExecWalletContext({
    ownerAddress: params.auth.ownerAddress,
    agentKey: params.auth.agentKey,
    requestedNetwork: params.input.network,
  });
  const network = parseTransferNetwork(walletContext.requestedNetwork);
  const transferLogData: CliTxLogCreateData = {
    ownerAddress: params.auth.ownerAddress,
    agentKey: params.auth.agentKey,
    idempotencyKey: params.idempotencyKey,
    kind: "transfer",
    network,
    to,
    token,
    amount: params.input.amount,
    decimals,
    valueEth: null,
    data: null,
    txHash: null,
  };

  const replayResponse = await replayIfFinalized({
    db: params.db,
    ownerAddress: params.auth.ownerAddress,
    agentKey: params.auth.agentKey,
    idempotencyKey: params.idempotencyKey,
    walletAddress: walletContext.walletAddress,
    kind: "transfer",
    assertMatch: (existing) => {
      assertTransferIdempotencyMatch({
        existing,
        network,
        to,
        token,
        amount: params.input.amount,
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
    db: params.db,
    ownerAddress: params.auth.ownerAddress,
    agentKey: params.auth.agentKey,
    idempotencyKey: params.idempotencyKey,
    data: transferLogData,
    walletAddress: walletContext.walletAddress,
    kind: "transfer",
    assertMatch: (raced) => {
      assertTransferIdempotencyMatch({
        existing: raced,
        network,
        to,
        token,
        amount: params.input.amount,
        decimals,
      });
    },
  });
  if ("response" in reservation) {
    return reservation.response;
  }

  const { smartAccount, walletAddress } = await walletContext.getExecutionContext();
  const transferCall =
    token === "eth"
      ? {
          to,
          value: amountAtomic,
          data: "0x" as const,
        }
      : (() => {
          const erc20TransferData = encodeFunctionData({
            abi: erc20Abi,
            functionName: "transfer",
            args: [to, amountAtomic],
          });
          return {
            to: token === "usdc" ? usdcContractForNetwork(network) : token,
            value: 0n,
            data: erc20TransferData,
          };
        })();
  let userOpHash: `0x${string}`;

  if ("resumeUserOpHash" in reservation) {
    userOpHash = reservation.resumeUserOpHash;
  } else {
    try {
      const dataSuffix = baseBuilderCodeDataSuffixForNetwork(network);
      const transferResult = await smartAccount.sendUserOperation({
        network,
        calls: [transferCall],
        ...(dataSuffix ? { dataSuffix } : {}),
        idempotencyKey: params.idempotencyKey ?? undefined,
      });
      userOpHash = transferResult.userOpHash;
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
        kind: "transfer",
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
        ...transferLogData,
        userOpHash,
        txHash: transactionHash,
      },
    });
  }

  return buildSuccessResponse({
    kind: "transfer",
    walletAddress,
    network,
    transactionHash,
    userOpHash,
  });
}
