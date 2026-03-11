import "server-only";

import {
  buildFarcasterX402SigningRequest,
  buildFarcasterX402Spec,
  buildFarcasterHostedX402PaymentResult,
  type FarcasterHostedX402PaymentResult,
} from "@cobuild/wire";
import { CliPolicyError } from "./errors";
import { getCliCdpClient } from "./cdp-client";
import { getCliAccountPolicyId, getCliEnv, parseCliBoolean } from "./env";
import { getOrCreateCliAgentOwnerAccount } from "./wallet-store";

const FARCASTER_X402_SPEC = buildFarcasterX402Spec();

export type CliFarcasterX402PaymentResult = FarcasterHostedX402PaymentResult;

export class CliFarcasterX402SigningError extends Error {}

function parsePositiveInteger(value: string, label: string): string {
  const trimmed = value.trim();
  if (!/^[1-9]\d*$/.test(trimmed)) {
    throw new CliPolicyError(`${label} must be a positive integer string`);
  }
  return trimmed;
}

type X402Policy = {
  maxAmountMicroUsdc: string;
  requireAccountPolicy: boolean;
};

function resolveX402Policy(): X402Policy {
  const maxAmount = getCliEnv("FARCASTER_X402_MAX_AMOUNT_MICRO_USDC");
  const requireAccountPolicyEnv = getCliEnv("FARCASTER_X402_REQUIRE_ACCOUNT_POLICY");
  const requireAccountPolicy =
    requireAccountPolicyEnv === undefined
      ? process.env.NODE_ENV === "production"
      : parseCliBoolean("FARCASTER_X402_REQUIRE_ACCOUNT_POLICY");

  return {
    maxAmountMicroUsdc: maxAmount
      ? parsePositiveInteger(maxAmount, "FARCASTER_X402_MAX_AMOUNT_MICRO_USDC")
      : FARCASTER_X402_SPEC.amount,
    requireAccountPolicy,
  };
}

function assertPolicyPreconditions(policy: X402Policy): void {
  if (BigInt(FARCASTER_X402_SPEC.amount) > BigInt(policy.maxAmountMicroUsdc)) {
    throw new CliPolicyError("x402 signing policy violation: amount exceeds configured cap");
  }
  if (policy.requireAccountPolicy) {
    if (!getCliAccountPolicyId()) {
      throw new CliPolicyError(
        "x402 signing requires CLI_ACCOUNT_POLICY_ID (or BROKER_ACCOUNT_POLICY_ID)"
      );
    }
  }
}

export async function createCliFarcasterX402Payment(params: {
  ownerAddress: `0x${string}`;
  agentKey: string;
}): Promise<CliFarcasterX402PaymentResult> {
  const policy = resolveX402Policy();
  assertPolicyPreconditions(policy);

  const ownerAccount = await getOrCreateCliAgentOwnerAccount({
    ownerAddress: params.ownerAddress,
    agentKey: params.agentKey,
  });

  const signingRequest = buildFarcasterX402SigningRequest({
    payerAddress: ownerAccount.address,
  });

  const cdp = getCliCdpClient();
  let signature: `0x${string}`;
  try {
    const signed = await cdp.evm.signTypedData({
      address: ownerAccount.address,
      domain: signingRequest.domain,
      types: signingRequest.types,
      primaryType: signingRequest.primaryType,
      message: signingRequest.authorization,
    });
    signature = signed.signature;
  } catch {
    throw new CliFarcasterX402SigningError(
      "Failed to sign x402 payment authorization with the cli payer wallet"
    );
  }

  const xPayment = signingRequest.encodePayment(signature);

  return buildFarcasterHostedX402PaymentResult({
    xPayment,
    payerAddress: ownerAccount.address,
    agentKey: params.agentKey,
    validAfter: signingRequest.validAfter,
    validBefore: signingRequest.validBefore,
  });
}
