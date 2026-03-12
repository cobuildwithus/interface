import { type NextResponse } from "next/server";
import {
  buildCliProtocolPlanLogKind,
  type CliProtocolPlanRequest,
  validateCliProtocolPlanRequest,
} from "@cobuild/wire";
import { assertCliProtocolPlanAllowed } from "@/lib/server/cli/policy";
import { RequestValidationError } from "@/lib/server/cli/http";
import { resolveCliExecWalletContext } from "@/lib/server/cli/wallet-store";
import {
  buildProtocolPlanIdempotencyFingerprint,
  assertProtocolPlanIdempotencyMatch,
  type CliExecDb,
  type CliTxLogCreateData,
} from "./idempotency";
import { executeHostedCliUserOperation } from "./hosted-user-operation";
import { parseEtherInput, parseTxNetwork } from "./validation";

type ProtocolPlanInput = {
  kind: "protocol-plan";
  network?: string;
  idempotencyKey?: string;
  agentKey?: string;
  action: string;
  riskClass: string;
  steps: unknown[];
};

function validateProtocolPlanRequest(params: {
  input: ProtocolPlanInput;
  requestedNetwork: string;
}): CliProtocolPlanRequest {
  try {
    return validateCliProtocolPlanRequest({
      kind: "protocol-plan",
      network: params.input.network ?? params.requestedNetwork,
      action: params.input.action,
      riskClass: params.input.riskClass,
      steps: params.input.steps,
    });
  } catch (error) {
    throw new RequestValidationError(error instanceof Error ? error.message : String(error));
  }
}

export async function handleProtocolPlanExecution(params: {
  db: CliExecDb;
  auth: { ownerAddress: `0x${string}`; agentKey: string };
  input: ProtocolPlanInput;
  idempotencyKey: string | null;
}): Promise<NextResponse> {
  const walletContext = await resolveCliExecWalletContext({
    ownerAddress: params.auth.ownerAddress,
    agentKey: params.auth.agentKey,
    requestedNetwork: params.input.network,
  });
  const protocolRequest = validateProtocolPlanRequest({
    input: params.input,
    requestedNetwork: walletContext.requestedNetwork,
  });
  assertCliProtocolPlanAllowed(protocolRequest);

  const network = parseTxNetwork(protocolRequest.network);
  const logKind = buildCliProtocolPlanLogKind(protocolRequest.action);
  const lastStep = protocolRequest.steps.at(-1);
  if (!lastStep) {
    throw new RequestValidationError("steps must contain at least one step.");
  }

  const fingerprint = buildProtocolPlanIdempotencyFingerprint({
    logKind,
    network,
    steps: protocolRequest.steps,
  });
  const txLogData: CliTxLogCreateData = {
    ownerAddress: params.auth.ownerAddress,
    agentKey: params.auth.agentKey,
    idempotencyKey: params.idempotencyKey,
    kind: "protocol-plan",
    network,
    to: lastStep.transaction.to,
    token: null,
    amount: null,
    decimals: null,
    valueEth: lastStep.transaction.valueEth,
    data: fingerprint,
    txHash: null,
  };

  return await executeHostedCliUserOperation({
    db: params.db,
    auth: params.auth,
    walletContext,
    idempotencyKey: params.idempotencyKey,
    kind: "protocol-plan",
    network,
    txLogData,
    calls: protocolRequest.steps.map((step, index) => ({
      to: step.transaction.to,
      value: parseEtherInput(step.transaction.valueEth, `steps[${index}].transaction.valueEth`),
      data: step.transaction.data,
    })),
    assertMatch: (existing) => {
      assertProtocolPlanIdempotencyMatch({
        existing,
        network,
        fingerprint,
      });
    },
  });
}
