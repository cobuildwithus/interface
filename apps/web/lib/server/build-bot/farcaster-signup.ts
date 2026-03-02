import "server-only";

import type { EvmSmartAccount } from "@coinbase/cdp-sdk";
import type { Hash } from "viem";
import { encodeAbiParameters, encodeFunctionData, formatEther } from "viem";
import { optimism } from "viem/chains";
import { getClient } from "@/lib/domains/token/onchain/clients";
import { normalizeAddress } from "@/lib/shared/address";
import { getOrCreateBuildBotAgentSmartAccount } from "./wallet-store";

const FARCASTER_CONTRACTS = {
  idGateway: "0x00000000fc25870c6ed6b6c7e41fb078b7656f69",
  keyGateway: "0x00000000fc56947c7e7183f8ca4b62398caadf0b",
  idRegistry: "0x00000000fc6c5f01fc30151999387bb99a9f489b",
  signedKeyRequestValidator: "0x00000000fc700472606ed4fa22623acf62c60553",
} as const;

const idGatewayAbi = [
  {
    type: "function",
    name: "price",
    stateMutability: "view",
    inputs: [{ name: "extraStorage", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "register",
    stateMutability: "payable",
    inputs: [
      { name: "recovery", type: "address" },
      { name: "extraStorage", type: "uint256" },
    ],
    outputs: [{ name: "fid", type: "uint256" }],
  },
] as const;

const keyGatewayAbi = [
  {
    type: "function",
    name: "add",
    stateMutability: "nonpayable",
    inputs: [
      { name: "keyType", type: "uint32" },
      { name: "key", type: "bytes" },
      { name: "metadataType", type: "uint8" },
      { name: "metadata", type: "bytes" },
    ],
    outputs: [],
  },
] as const;

const idRegistryAbi = [
  {
    type: "function",
    name: "idOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "fid", type: "uint256" }],
  },
] as const;

const REGISTER_GAS_BUFFER_WEI = 200_000_000_000_000n;
const SIGNED_KEY_REQUEST_DEADLINE_SECONDS = 60 * 60;

type BuildBotFarcasterNetwork = "optimism";

export type BuildBotFarcasterSignupNeedsFundingResult = {
  status: "needs_funding";
  network: BuildBotFarcasterNetwork;
  ownerAddress: `0x${string}`;
  custodyAddress: `0x${string}`;
  recoveryAddress: `0x${string}`;
  idGatewayPriceWei: string;
  idGatewayPriceEth: string;
  balanceWei: string;
  balanceEth: string;
  requiredWei: string;
  requiredEth: string;
};

export type BuildBotFarcasterSignupCompletedResult = {
  status: "complete";
  network: BuildBotFarcasterNetwork;
  ownerAddress: `0x${string}`;
  custodyAddress: `0x${string}`;
  recoveryAddress: `0x${string}`;
  fid: string;
  idGatewayPriceWei: string;
  registerTxHash: `0x${string}`;
  addKeyTxHash: `0x${string}`;
};

export type BuildBotFarcasterSignupResult =
  | BuildBotFarcasterSignupNeedsFundingResult
  | BuildBotFarcasterSignupCompletedResult;

export class BuildBotFarcasterAlreadyRegisteredError extends Error {
  readonly fid: string;
  readonly custodyAddress: `0x${string}`;

  constructor(params: { fid: bigint; custodyAddress: `0x${string}` }) {
    super(
      `Farcaster account already exists for this agent wallet (fid: ${params.fid.toString()}).`
    );
    this.fid = params.fid.toString();
    this.custodyAddress = params.custodyAddress;
  }
}

export class BuildBotFarcasterUserOperationError extends Error {}

async function readFidByCustodyAddress(params: { custodyAddress: `0x${string}` }): Promise<bigint> {
  const client = getClient(optimism.id);
  return client.readContract({
    address: FARCASTER_CONTRACTS.idRegistry,
    abi: idRegistryAbi,
    functionName: "idOf",
    args: [params.custodyAddress],
  });
}

async function waitForUserOperation(params: {
  smartAccount: EvmSmartAccount;
  userOpHash: `0x${string}`;
  step: "register" | "add-key";
}): Promise<`0x${string}`> {
  const settled = await params.smartAccount.waitForUserOperation({
    userOpHash: params.userOpHash,
  });

  if (settled.status !== "complete") {
    throw new BuildBotFarcasterUserOperationError(
      `Farcaster ${params.step} user operation failed before confirmation`
    );
  }

  if (!settled.transactionHash) {
    throw new BuildBotFarcasterUserOperationError(
      `Farcaster ${params.step} user operation did not return a transaction hash`
    );
  }

  return settled.transactionHash as Hash;
}

export async function signupBuildBotFarcaster(params: {
  ownerAddress: `0x${string}`;
  agentKey: string;
  signerPublicKey: `0x${string}`;
  recoveryAddress?: `0x${string}`;
  extraStorage?: bigint;
}): Promise<BuildBotFarcasterSignupResult> {
  const extraStorage = params.extraStorage ?? 0n;
  const ownerAddress = normalizeAddress(params.ownerAddress);
  const recoveryAddress = normalizeAddress(params.recoveryAddress ?? params.ownerAddress);
  const signerPublicKey = params.signerPublicKey.toLowerCase() as `0x${string}`;

  const smartAccount = await getOrCreateBuildBotAgentSmartAccount({
    ownerAddress,
    agentKey: params.agentKey,
  });
  const custodyAddress = normalizeAddress(smartAccount.address);
  const client = getClient(optimism.id);

  const existingFid = await readFidByCustodyAddress({ custodyAddress });
  if (existingFid !== 0n) {
    throw new BuildBotFarcasterAlreadyRegisteredError({ fid: existingFid, custodyAddress });
  }

  const priceWei = await client.readContract({
    address: FARCASTER_CONTRACTS.idGateway,
    abi: idGatewayAbi,
    functionName: "price",
    args: [extraStorage],
  });
  const balanceWei = await client.getBalance({ address: custodyAddress });
  const requiredWei = priceWei + REGISTER_GAS_BUFFER_WEI;

  if (balanceWei < requiredWei) {
    return {
      status: "needs_funding",
      network: "optimism",
      ownerAddress,
      custodyAddress,
      recoveryAddress,
      idGatewayPriceWei: priceWei.toString(),
      idGatewayPriceEth: formatEther(priceWei),
      balanceWei: balanceWei.toString(),
      balanceEth: formatEther(balanceWei),
      requiredWei: requiredWei.toString(),
      requiredEth: formatEther(requiredWei),
    };
  }

  const registerData = encodeFunctionData({
    abi: idGatewayAbi,
    functionName: "register",
    args: [recoveryAddress, extraStorage],
  });
  const registerUserOp = await smartAccount.sendUserOperation({
    network: "optimism",
    calls: [{ to: FARCASTER_CONTRACTS.idGateway, data: registerData, value: priceWei }],
  });
  const registerTxHash = await waitForUserOperation({
    smartAccount,
    userOpHash: registerUserOp.userOpHash,
    step: "register",
  });

  const fid = await readFidByCustodyAddress({ custodyAddress });
  if (fid === 0n) {
    throw new BuildBotFarcasterUserOperationError(
      "Farcaster register confirmed but FID was not assigned to custody address"
    );
  }

  const deadline = BigInt(Math.floor(Date.now() / 1000) + SIGNED_KEY_REQUEST_DEADLINE_SECONDS);
  const signedKeyRequestSignature = await smartAccount.signTypedData({
    network: "optimism",
    domain: {
      name: "Farcaster SignedKeyRequestValidator",
      version: "1",
      chainId: optimism.id,
      verifyingContract: FARCASTER_CONTRACTS.signedKeyRequestValidator,
    },
    types: {
      SignedKeyRequest: [
        { name: "requestFid", type: "uint256" },
        { name: "key", type: "bytes" },
        { name: "deadline", type: "uint256" },
      ],
    },
    primaryType: "SignedKeyRequest",
    message: {
      requestFid: fid,
      key: signerPublicKey,
      deadline,
    },
  });

  const metadata = encodeAbiParameters(
    [
      {
        type: "tuple",
        components: [
          { name: "requestFid", type: "uint256" },
          { name: "requestSigner", type: "address" },
          { name: "signature", type: "bytes" },
          { name: "deadline", type: "uint256" },
        ],
      },
    ],
    [
      {
        requestFid: fid,
        requestSigner: custodyAddress,
        signature: signedKeyRequestSignature,
        deadline,
      },
    ]
  );

  const addKeyData = encodeFunctionData({
    abi: keyGatewayAbi,
    functionName: "add",
    args: [1, signerPublicKey, 1, metadata],
  });
  const addKeyUserOp = await smartAccount.sendUserOperation({
    network: "optimism",
    calls: [{ to: FARCASTER_CONTRACTS.keyGateway, data: addKeyData, value: 0n }],
  });
  const addKeyTxHash = await waitForUserOperation({
    smartAccount,
    userOpHash: addKeyUserOp.userOpHash,
    step: "add-key",
  });

  return {
    status: "complete",
    network: "optimism",
    ownerAddress,
    custodyAddress,
    recoveryAddress,
    fid: fid.toString(),
    idGatewayPriceWei: priceWei.toString(),
    registerTxHash,
    addKeyTxHash,
  };
}
