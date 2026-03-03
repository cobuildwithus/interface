import { type NextResponse } from "next/server";
import { isAddress } from "viem";
import { assertCliTransferAllowed } from "@/lib/server/cli/policy";
import { RequestValidationError } from "@/lib/server/cli/http";
import { waitForUserOperationComplete } from "@/lib/server/cli/user-operation";
import { getOrCreateCliAgentSmartAccount } from "@/lib/server/cli/wallet-store";
import { normalizeAddress } from "@/lib/shared/address";
import {
  assertTransferIdempotencyMatch,
  finalizeCliTxLog,
  replayIfFinalized,
  reserveOrReplay,
  type CliExecDb,
  type CliTxLogCreateData,
  writeCliTxLog,
} from "./idempotency";
import { buildSuccessResponse, UserOperationFailedError } from "./response";
import { parseEtherInput, parseTransferNetwork, parseUnitsInput } from "./validation";

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
  requestedNetwork: string;
  idempotencyKey: string | null;
  walletAddress?: string;
}): Promise<NextResponse> {
  const network = parseTransferNetwork(params.requestedNetwork);

  if (!isAddress(params.input.to)) {
    throw new RequestValidationError("Invalid recipient address");
  }

  const to = normalizeAddress(params.input.to);
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
    if (!isAddress(params.input.token)) {
      throw new RequestValidationError(
        "token must be 'eth', 'usdc', or an ERC-20 contract address"
      );
    }
    if (typeof params.input.decimals !== "number") {
      throw new RequestValidationError(
        "decimals is required when token is an ERC-20 contract address"
      );
    }

    token = normalizeAddress(params.input.token);
    amountAtomic = parseUnitsInput(params.input.amount, params.input.decimals, "amount");
  }

  if (amountAtomic <= 0n) {
    throw new RequestValidationError("amount must be greater than 0");
  }
  const decimals = params.input.decimals ?? null;
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
    walletAddress: params.walletAddress,
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
    walletAddress: params.walletAddress,
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

  const smartAccount = await getOrCreateCliAgentSmartAccount({
    ownerAddress: params.auth.ownerAddress,
    agentKey: params.auth.agentKey,
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

  if (params.idempotencyKey) {
    await finalizeCliTxLog({
      db: params.db,
      ownerAddress: params.auth.ownerAddress,
      agentKey: params.auth.agentKey,
      idempotencyKey: params.idempotencyKey,
      txHash: transactionHash,
    });
  } else {
    await writeCliTxLog({
      db: params.db,
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
