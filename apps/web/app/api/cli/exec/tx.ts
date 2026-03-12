import { type NextResponse } from "next/server";
import { canonicalizeBaseBuilderCodeAttributedData, normalizeHex } from "@cobuild/wire";
import { assertCliTxAllowed } from "@/lib/server/cli/policy";
import { RequestValidationError } from "@/lib/server/cli/http";
import { resolveCliExecWalletContext } from "@/lib/server/cli/wallet-store";
import {
  assertTxIdempotencyMatch,
  findCliTxLogByIdempotency,
  hasResumableUserOperation,
  replayIfFinalized,
  type CliExecDb,
  type CliTxLogCreateData,
} from "./idempotency";
import { executeHostedCliUserOperation } from "./hosted-user-operation";
import { parseEtherInput, parseEvmAddressInput, parseTxNetwork } from "./validation";

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
  idempotencyKey: string | null;
}): Promise<NextResponse> {
  const to = parseEvmAddressInput(params.input.to, "to", "Invalid transaction target address");
  const valueEth = params.input.valueEth;
  const valueWei = parseEtherInput(valueEth, "valueEth");
  if (valueWei < 0n) {
    throw new RequestValidationError("valueEth must be greater than or equal to 0");
  }
  const requestData = normalizeHex(params.input.data as `0x${string}`);
  const canonicalTxData = canonicalizeBaseBuilderCodeAttributedData(requestData);
  const walletContext = await resolveCliExecWalletContext({
    ownerAddress: params.auth.ownerAddress,
    agentKey: params.auth.agentKey,
    requestedNetwork: params.input.network,
  });
  const network = parseTxNetwork(walletContext.requestedNetwork);
  const replayResponse = await replayIfFinalized({
    db: params.db,
    ownerAddress: params.auth.ownerAddress,
    agentKey: params.auth.agentKey,
    idempotencyKey: params.idempotencyKey,
    walletAddress: walletContext.walletAddress,
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

  const existing = await findCliTxLogByIdempotency({
    db: params.db,
    ownerAddress: params.auth.ownerAddress,
    agentKey: params.auth.agentKey,
    idempotencyKey: params.idempotencyKey,
  });
  const canResumeExistingUserOperation =
    !!existing &&
    (() => {
      assertTxIdempotencyMatch({
        existing,
        network,
        to,
        valueWei,
        data: canonicalTxData,
      });
      return hasResumableUserOperation(existing);
    })();

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

  if (!canResumeExistingUserOperation) {
    assertCliTxAllowed({
      network,
      to,
      valueWei,
      data: canonicalTxData,
    });
  }

  return await executeHostedCliUserOperation({
    db: params.db,
    auth: params.auth,
    walletContext,
    idempotencyKey: params.idempotencyKey,
    kind: "tx",
    network,
    txLogData,
    calls: [{ to, value: valueWei, data: canonicalTxData }],
    assertMatch: (raced) => {
      assertTxIdempotencyMatch({
        existing: raced,
        network,
        to,
        valueWei,
        data: canonicalTxData,
      });
    },
    skipReplayIfFinalized: true,
  });
}
