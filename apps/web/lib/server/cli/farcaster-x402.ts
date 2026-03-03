import "server-only";

import { randomBytes } from "crypto";
import type { Address } from "viem";
import { normalizeAddress as normalizeEvmAddress } from "@/lib/shared/address";
import { CliPolicyError } from "./errors";
import { getCliCdpClient } from "./cdp-client";
import { getCliAccountPolicyId, getCliEnv, parseCliBoolean } from "./env";
import { getOrCreateCliAgentOwnerAccount } from "./wallet-store";

const X402_PAYMENT_VERSION = 1 as const;
const X402_SCHEME = "exact" as const;
const X402_NETWORK = "base" as const;
const X402_VALIDITY_SECONDS = 60;

const USDC_BASE: Address = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const NEYNAR_PAY_TO: Address = "0xa6a8736f18f383f1cc2d938576933e5ea7df01a1";
const X402_AMOUNT_MICRO_USDC = "1000";
const X402_TRANSFER_PRIMARY_TYPE = "TransferWithAuthorization";
const BASE_CHAIN_ID = 8453;

const X402_TYPED_DATA_DOMAIN = {
  name: "USD Coin",
  version: "2",
  chainId: BASE_CHAIN_ID,
  verifyingContract: USDC_BASE,
} as const;

const X402_TYPED_DATA_TYPES = {
  EIP712Domain: [
    { name: "name", type: "string" },
    { name: "version", type: "string" },
    { name: "chainId", type: "uint256" },
    { name: "verifyingContract", type: "address" },
  ],
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
} as const;

type X402AuthorizationPayload = {
  from: Address;
  to: Address;
  value: string;
  validAfter: string;
  validBefore: string;
  nonce: `0x${string}`;
};

type X402PaymentPayload = {
  x402Version: number;
  scheme: "exact";
  network: "base";
  payload: {
    signature: `0x${string}`;
    authorization: X402AuthorizationPayload;
  };
};

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

function normalizeAddress(value: string, label: string): Address {
  try {
    return normalizeEvmAddress(value);
  } catch {
    throw new CliPolicyError(`${label} must be a 20-byte hex address`);
  }
}

function parsePositiveInteger(value: string, label: string): string {
  const trimmed = value.trim();
  if (!/^[1-9]\d*$/.test(trimmed)) {
    throw new CliPolicyError(`${label} must be a positive integer string`);
  }
  return trimmed;
}

type X402Policy = {
  requiredToken: Address;
  requiredPayTo: Address;
  maxAmountMicroUsdc: string;
  requireAccountPolicy: boolean;
};

function resolveX402Policy(): X402Policy {
  const token = getCliEnv("FARCASTER_X402_ALLOWED_TOKEN");
  const payTo = getCliEnv("FARCASTER_X402_ALLOWED_PAY_TO");
  const maxAmount = getCliEnv("FARCASTER_X402_MAX_AMOUNT_MICRO_USDC");
  const requireAccountPolicyEnv = getCliEnv("FARCASTER_X402_REQUIRE_ACCOUNT_POLICY");
  const requireAccountPolicy =
    requireAccountPolicyEnv === undefined
      ? process.env.NODE_ENV === "production"
      : parseCliBoolean("FARCASTER_X402_REQUIRE_ACCOUNT_POLICY");

  return {
    requiredToken: token ? normalizeAddress(token, "FARCASTER_X402_ALLOWED_TOKEN") : USDC_BASE,
    requiredPayTo: payTo ? normalizeAddress(payTo, "FARCASTER_X402_ALLOWED_PAY_TO") : NEYNAR_PAY_TO,
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
  if (X402_TYPED_DATA_DOMAIN.verifyingContract !== policy.requiredToken) {
    throw new CliPolicyError("x402 signing policy violation: token contract is not allowlisted");
  }
  if (NEYNAR_PAY_TO !== policy.requiredPayTo) {
    throw new CliPolicyError("x402 signing policy violation: recipient is not allowlisted");
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
  const xPayment = Buffer.from(JSON.stringify(paymentPayload)).toString("base64");

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
