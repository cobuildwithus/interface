"use client";

import { contracts } from "@/lib/domains/token/onchain/addresses";
import { submitUsdcPermit } from "@/lib/domains/token/onchain/usdc-permit";
import { useCallback } from "react";
import {
  type Abi,
  type Address,
  BaseError,
  type Hex,
  maxUint256,
  parseErc6492Signature,
  type TypedDataDomain,
} from "viem";
import { base } from "viem/chains";
import { usePublicClient, useSignTypedData } from "wagmi";

const eip2612Abi = [
  {
    type: "function",
    stateMutability: "view",
    name: "name",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "version",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "nonces",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const satisfies Abi;

type SignParams = {
  spender: Address;
  value: bigint;
  owner: Address;
  token?: Address;
  deadline?: bigint;
};

export function useSignUsdcPermit() {
  const publicClient = usePublicClient({ chainId: base.id });
  const { signTypedDataAsync } = useSignTypedData();

  const signPermit = useCallback(
    async ({
      spender,
      value,
      owner,
      token = contracts.USDCBase,
      deadline = maxUint256,
    }: SignParams) => {
      if (!publicClient) throw new Error("No public client");

      const [name, version, nonce] = await Promise.all([
        publicClient.readContract({ address: token, abi: eip2612Abi, functionName: "name" }),
        publicClient.readContract({ address: token, abi: eip2612Abi, functionName: "version" }),
        publicClient.readContract({
          address: token,
          abi: eip2612Abi,
          functionName: "nonces",
          args: [owner],
        }),
      ]);

      const types = {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      } as const;

      const domain: TypedDataDomain = {
        name: name as string,
        version: (version as string) || "2",
        chainId: base.id,
        verifyingContract: token,
      } as const;

      const message = {
        owner,
        spender,
        value,
        nonce: nonce as bigint,
        deadline,
      } as const;

      let wrappedSig: Hex;
      try {
        wrappedSig = (await signTypedDataAsync({
          account: owner,
          primaryType: "Permit",
          types,
          domain,
          message,
        })) as Hex;
      } catch (error) {
        const short =
          error instanceof BaseError ? error.shortMessage : (error as Error | undefined)?.message;
        const normalized = (short || "").toLowerCase();
        if (normalized.includes("rejected")) {
          const err = new Error("User rejected the request.") as Error & { code: string };
          err.code = "USER_REJECTED";
          err.name = "UserRejected";
          throw err;
        }
        throw error;
      }

      const unwrappedSig = parseErc6492Signature(wrappedSig);
      const data = await submitUsdcPermit({
        chainId: base.id,
        token,
        owner,
        spender,
        value,
        deadline,
        signature: unwrappedSig.signature,
      });

      if ("success" in data && data.success === true) {
        return {
          signature: unwrappedSig.signature,
          permitBytesArgs: [owner, spender, value, deadline, unwrappedSig.signature] as const,
          typedData: { domain, types, primaryType: "Permit" as const, message },
          serverTxHash: data.txHash,
          explorerUrl: data.explorerUrl ?? null,
        } as const;
      }

      const fallbackMsg = "error" in data ? data.error : "Permit submission failed";
      throw new Error(fallbackMsg);
    },
    [publicClient, signTypedDataAsync]
  );

  return { signPermit };
}
