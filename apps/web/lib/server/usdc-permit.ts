import "server-only";

import {
  Address,
  BaseError,
  Hash,
  Hex,
  createWalletClient,
  getAddress,
  http,
  parseAbi,
  parseErc6492Signature,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { contracts } from "@/lib/domains/token/onchain/addresses";
import { explorerUrl, getChain, getRpcUrl } from "@/lib/domains/token/onchain/chains";
import { getClient } from "@/lib/domains/token/onchain/clients";
import { isRecord } from "@/lib/server/validation";
import type { ErrorLike } from "@/lib/shared/errors";
import type { JsonValue } from "@/lib/shared/json";

const eip2612Abi = parseAbi([
  "function nonces(address owner) view returns (uint256)",
  "function name() view returns (string)",
  "function version() view returns (string)",
  "function permit(address owner, address spender, uint256 value, uint256 deadline, bytes sig)",
]);

const BASE_CHAIN = getChain(base.id);
const permitPkSingleton = process.env.USDC_PERMIT_PK as `0x${string}` | undefined;
const accountSingleton = permitPkSingleton ? privateKeyToAccount(permitPkSingleton) : undefined;

let publicClientSingleton: ReturnType<typeof getClient> | null = null;
let serverWalletSingleton: ReturnType<typeof createWalletClient> | null = null;

function getPublicClient() {
  if (!publicClientSingleton) {
    publicClientSingleton = getClient(base.id);
  }
  return publicClientSingleton;
}

function getServerWallet() {
  if (!accountSingleton) return null;
  if (!serverWalletSingleton) {
    const rpcUrl = getRpcUrl(BASE_CHAIN, "http");
    serverWalletSingleton = createWalletClient({
      account: accountSingleton,
      chain: BASE_CHAIN,
      transport: http(rpcUrl),
    });
  }
  return serverWalletSingleton;
}

const extractErrorMessage = (error: ErrorLike): string => {
  if (error instanceof BaseError) {
    return `${error.shortMessage ?? ""} ${error.details ?? ""}`.trim() || error.message;
  }
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: string | null }).message;
    if (typeof message === "string") return message;
  }
  return "";
};

const isNonceTooLowError = (error: ErrorLike) => {
  const normalized = extractErrorMessage(error).toLowerCase();
  if (!normalized) return false;
  return normalized.includes("nonce too low") || normalized.includes("nonce provided");
};

const extractSuggestedNonce = (error: ErrorLike): number | null => {
  const normalized = extractErrorMessage(error);
  const match = normalized.match(/next nonce\s+(\d+)/i);
  if (!match) return null;
  try {
    return Number.parseInt(match[1], 10);
  } catch {
    return null;
  }
};

type PermitBody = {
  chainId?: number;
  token?: Address;
  owner: Address;
  spender: Address;
  value: string | number;
  deadline: string | number;
  signature: Hex;
};

export type SubmitPermitSuccess = {
  success: true;
  txHash: Hex;
  explorerUrl: string;
};

export type SubmitPermitError = { error: string };

export type SubmitPermitResponse = SubmitPermitSuccess | SubmitPermitError;

export async function submitUsdcPermitServer(
  body: JsonValue | null | undefined
): Promise<SubmitPermitResponse> {
  if (!isRecord(body)) {
    return { error: "Invalid JSON body" };
  }

  try {
    const payload = body as PermitBody;
    const chainId = typeof payload.chainId === "number" ? payload.chainId : base.id;
    const token = (payload.token ?? contracts.USDCBase) as Address;
    const owner = getAddress(payload.owner);
    const spender = getAddress(payload.spender);
    const value = BigInt(payload.value);
    const deadline = BigInt(payload.deadline);
    let signature = payload.signature as Hex;

    if (chainId !== base.id || token.toLowerCase() !== contracts.USDCBase.toLowerCase()) {
      return { error: "Unsupported chain/token" };
    }

    const allowedSpender = (process.env.USDC_SPENDER ?? contracts.CobuildSwap) as Address;
    if (spender.toLowerCase() !== allowedSpender.toLowerCase()) {
      return { error: "Unsupported spender" };
    }

    const serverWallet = getServerWallet();
    if (!accountSingleton || !serverWallet) {
      return { error: "Server not configured. Missing USDC_PERMIT_PK." };
    }

    try {
      signature = parseErc6492Signature(signature).signature;
    } catch {
      // Use the raw signature if not wrapped
    }

    const publicClient = getPublicClient();
    const sim = await publicClient.simulateContract({
      address: token,
      abi: eip2612Abi,
      functionName: "permit",
      args: [owner, spender, value, deadline, signature],
      account: accountSingleton,
    });

    const walletAddress = accountSingleton.address;
    let attemptNonce = await publicClient.getTransactionCount({
      address: walletAddress,
      blockTag: "pending",
    });

    let hash: Hash | undefined;
    const maxRetries = 5;
    for (let attempt = 0; attempt < maxRetries; attempt += 1) {
      try {
        hash = await serverWallet.writeContract({ ...sim.request, nonce: attemptNonce });
        break;
      } catch (sendError) {
        const error = sendError as ErrorLike;
        if (!isNonceTooLowError(error)) {
          throw sendError;
        }
        if (attempt === maxRetries - 1) {
          throw sendError;
        }
        const previousNonce = attemptNonce;
        const suggested = extractSuggestedNonce(error);
        if (suggested !== null && suggested >= previousNonce) {
          attemptNonce = suggested;
        } else {
          const refreshed = await publicClient.getTransactionCount({
            address: walletAddress,
            blockTag: "pending",
          });
          attemptNonce = refreshed > previousNonce ? refreshed : previousNonce + 1;
        }
      }
    }

    if (!hash) {
      throw new Error("Failed to submit USDC permit transaction after retries");
    }

    return {
      success: true,
      txHash: hash,
      explorerUrl: explorerUrl(chainId, hash, "tx"),
    };
  } catch (error) {
    const message = extractErrorMessage(error as ErrorLike) || "Unexpected error";
    console.error(message);
    return { error: message };
  }
}
