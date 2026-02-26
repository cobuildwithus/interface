import type { Address, Hex } from "viem";
import { submitUsdcPermitAction } from "@/app/(app)/actions/usdc-permit";

export type SubmitPermitParams = {
  chainId: number;
  token: Address;
  owner: Address;
  spender: Address;
  value: bigint;
  deadline: bigint;
  signature: Hex;
};

export type SubmitPermitSuccess = {
  success: true;
  txHash: Hex;
  explorerUrl?: string;
};

export type SubmitPermitError = { error: string };

export type SubmitPermitResponse = SubmitPermitSuccess | SubmitPermitError;

export async function submitUsdcPermit(params: SubmitPermitParams): Promise<SubmitPermitResponse> {
  try {
    const data = await submitUsdcPermitAction({
      chainId: params.chainId,
      token: params.token,
      owner: params.owner,
      spender: params.spender,
      value: params.value,
      deadline: params.deadline,
      signature: params.signature,
    });

    if ("error" in data && data.error) return { error: data.error };
    if ("success" in data && data.success === true) return data;
    return { error: "Permit submission failed" };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}
