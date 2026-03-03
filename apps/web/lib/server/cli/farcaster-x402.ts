import "server-only";

import { randomBytes } from "crypto";
import {
  BASE_CHAIN_ID,
  USDC_EIP712_DOMAIN_NAME,
  USDC_EIP712_DOMAIN_VERSION,
  X402_AUTH_TTL_SECONDS,
  X402_NETWORK,
  X402_PAY_TO_ADDRESS,
  X402_SCHEME,
  X402_TRANSFER_PRIMARY_TYPE,
  X402_USDC_CONTRACT,
  X402_VALUE_MICRO_USDC,
  X402_VERSION,
  buildX402TypedDataDomain,
  buildX402TypedDataTypes,
  encodeX402PaymentPayload,
  type X402AuthorizationPayload,
  type X402PaymentPayload,
} from "@cobuild/wire";
import type { Address } from "viem";
import { CliPolicyError } from "./errors";
import { getCliCdpClient } from "./cdp-client";
import { getCliAccountPolicyId, getCliEnv, parseCliBoolean } from "./env";
import { getOrCreateCliAgentOwnerAccount } from "./wallet-store";

// Keep this aligned with local CLI x402 auth TTL to avoid cross-surface drift.
const X402_VALIDITY_SECONDS = X402_AUTH_TTL_SECONDS;

const X402_PAYMENT_VERSION: 1 = X402_VERSION;
const USDC_BASE: Address = X402_USDC_CONTRACT;
const NEYNAR_PAY_TO: Address = X402_PAY_TO_ADDRESS;
const X402_AMOUNT_MICRO_USDC = X402_VALUE_MICRO_USDC;

const X402_TYPED_DATA_DOMAIN = buildX402TypedDataDomain({
  name: USDC_EIP712_DOMAIN_NAME,
  version: USDC_EIP712_DOMAIN_VERSION,
  chainId: BASE_CHAIN_ID,
  verifyingContract: USDC_BASE,
});

const X402_TYPED_DATA_TYPES = buildX402TypedDataTypes();

export type CliFarcasterX402PaymentResult = {
  xPayment: string;
  payerAddress: Address;
  payTo: Address;
  token: Address;
  amount: string;
  network: "base";
  validAfter: number;
  validBefore: number;
};

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
      : X402_AMOUNT_MICRO_USDC,
    requireAccountPolicy,
  };
}

function assertPolicyPreconditions(policy: X402Policy): void {
  if (X402_TRANSFER_PRIMARY_TYPE !== "TransferWithAuthorization") {
    throw new CliPolicyError("x402 signing policy violation: typed-data primaryType mismatch");
  }
  if (X402_TYPED_DATA_DOMAIN.chainId !== BASE_CHAIN_ID) {
    throw new CliPolicyError("x402 signing policy violation: chainId is not Base mainnet");
  }
  if (X402_TYPED_DATA_DOMAIN.verifyingContract !== USDC_BASE) {
    throw new CliPolicyError("x402 signing policy violation: token contract must be USDC on Base");
  }
  if (NEYNAR_PAY_TO !== "0xa6a8736f18f383f1cc2d938576933e5ea7df01a1") {
    throw new CliPolicyError("x402 signing policy violation: pay-to must be Neynar");
  }
  if (BigInt(X402_AMOUNT_MICRO_USDC) > BigInt(policy.maxAmountMicroUsdc)) {
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

function randomBytes32Hex(): `0x${string}` {
  return `0x${randomBytes(32).toString("hex")}`;
}

function buildX402Authorization(params: {
  from: Address;
  validAfter: number;
  validBefore: number;
}): X402AuthorizationPayload {
  return {
    from: params.from,
    to: NEYNAR_PAY_TO,
    value: X402_AMOUNT_MICRO_USDC,
    validAfter: String(params.validAfter),
    validBefore: String(params.validBefore),
    nonce: randomBytes32Hex(),
  };
}

function buildX402PaymentPayload(params: {
  signature: `0x${string}`;
  authorization: X402AuthorizationPayload;
}): X402PaymentPayload {
  return {
    x402Version: X402_PAYMENT_VERSION,
    scheme: X402_SCHEME,
    network: X402_NETWORK,
    payload: {
      signature: params.signature,
      authorization: params.authorization,
    },
  };
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

  const validAfter = 0;
  const validBefore = Math.floor(Date.now() / 1000) + X402_VALIDITY_SECONDS;
  const authorization = buildX402Authorization({
    from: ownerAccount.address,
    validAfter,
    validBefore,
  });

  const cdp = getCliCdpClient();
  let signature: `0x${string}`;
  try {
    const signed = await cdp.evm.signTypedData({
      address: ownerAccount.address,
      domain: X402_TYPED_DATA_DOMAIN,
      types: X402_TYPED_DATA_TYPES,
      primaryType: X402_TRANSFER_PRIMARY_TYPE,
      message: authorization,
    });
    signature = signed.signature;
  } catch {
    throw new CliFarcasterX402SigningError(
      "Failed to sign x402 payment authorization with the cli payer wallet"
    );
  }

  const paymentPayload = buildX402PaymentPayload({ signature, authorization });
  const xPayment = encodeX402PaymentPayload(paymentPayload);

  return {
    xPayment,
    payerAddress: ownerAccount.address,
    payTo: NEYNAR_PAY_TO,
    token: USDC_BASE,
    amount: X402_AMOUNT_MICRO_USDC,
    network: X402_NETWORK,
    validAfter,
    validBefore,
  };
}
