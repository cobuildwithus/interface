import "server-only";

import {
  FARCASTER_CONTRACTS,
  FARCASTER_ID_GATEWAY_ABI,
  FARCASTER_ID_REGISTRY_ABI,
  baseBuilderCodeDataSuffixForNetwork,
  buildFarcasterSignupCompletedResult,
  buildFarcasterSignupNeedsFundingResult,
  buildFarcasterSignedKeyRequestMetadata,
  buildFarcasterSignedKeyRequestTypedData,
  buildFarcasterSignupCallPlan,
  buildFarcasterSignupExecutableCalls,
  computeFarcasterSignedKeyRequestDeadline,
  evaluateFarcasterSignupPreflight,
  normalizeEvmAddress as normalizeAddress,
  type FarcasterSignupResult,
} from "@cobuild/wire";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { optimism } from "viem/chains";
import { getClient } from "@/lib/domains/token/onchain/clients";
import { waitForUserOperationComplete } from "./user-operation";
import { getOrCreateCliAgentSmartAccount } from "./wallet-store";

export class CliFarcasterAlreadyRegisteredError extends Error {
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

export class CliFarcasterUserOperationError extends Error {}

async function readFidByCustodyAddress(params: { custodyAddress: `0x${string}` }): Promise<bigint> {
  const client = getClient(optimism.id);
  return client.readContract({
    address: FARCASTER_CONTRACTS.idRegistry,
    abi: FARCASTER_ID_REGISTRY_ABI,
    functionName: "idOf",
    args: [params.custodyAddress],
  });
}

export async function signupCliFarcaster(params: {
  ownerAddress: `0x${string}`;
  agentKey: string;
  signerPublicKey: `0x${string}`;
  recoveryAddress?: `0x${string}`;
  extraStorage?: bigint;
}): Promise<FarcasterSignupResult> {
  const extraStorage = params.extraStorage ?? 0n;
  const ownerAddress = normalizeAddress(params.ownerAddress, "ownerAddress");
  const recoveryAddress = normalizeAddress(
    params.recoveryAddress ?? params.ownerAddress,
    "recoveryAddress"
  );
  const signerPublicKey = params.signerPublicKey.toLowerCase() as `0x${string}`;

  const smartAccount = await getOrCreateCliAgentSmartAccount({
    ownerAddress,
    agentKey: params.agentKey,
  });
  const custodyAddress = normalizeAddress(smartAccount.address, "smartAccount.address");
  const client = getClient(optimism.id);

  const existingFid = await readFidByCustodyAddress({ custodyAddress });
  if (existingFid > 0n) {
    throw new CliFarcasterAlreadyRegisteredError({ fid: existingFid, custodyAddress });
  }

  const priceWei = await client.readContract({
    address: FARCASTER_CONTRACTS.idGateway,
    abi: FARCASTER_ID_GATEWAY_ABI,
    functionName: "price",
    args: [extraStorage],
  });
  const balanceWei = await client.getBalance({ address: custodyAddress });
  const preflight = evaluateFarcasterSignupPreflight({
    custodyAddress,
    existingFid,
    idGatewayPriceWei: priceWei,
    balanceWei,
  });

  if (preflight.status === "needs_funding") {
    return buildFarcasterSignupNeedsFundingResult({
      ownerAddress,
      custodyAddress,
      recoveryAddress,
      idGatewayPriceWei: priceWei,
      balanceWei,
      requiredWei: preflight.requiredWei,
    });
  }

  const deadline = computeFarcasterSignedKeyRequestDeadline();
  const requestSigner = privateKeyToAccount(generatePrivateKey());
  const typedData = buildFarcasterSignedKeyRequestTypedData({
    requestFid: 0n,
    signerPublicKey,
    deadline,
  });
  const signedKeyRequestSignature = await requestSigner.signTypedData({
    domain: typedData.domain,
    types: { SignedKeyRequest: typedData.types.SignedKeyRequest },
    primaryType: typedData.primaryType,
    message: typedData.message,
  });
  const signedKeyRequestMetadata = buildFarcasterSignedKeyRequestMetadata({
    requestFid: typedData.message.requestFid,
    requestSigner: requestSigner.address,
    signature: signedKeyRequestSignature,
    deadline: typedData.message.deadline,
  });

  const signupCallPlan = buildFarcasterSignupCallPlan({
    recoveryAddress,
    extraStorage,
    idGatewayPriceWei: priceWei,
    signerPublicKey,
    signedKeyRequestMetadata,
  });
  const executableCalls = buildFarcasterSignupExecutableCalls(signupCallPlan);
  const dataSuffix = baseBuilderCodeDataSuffixForNetwork(signupCallPlan.network);
  const signupUserOp = await smartAccount.sendUserOperation({
    network: signupCallPlan.network,
    calls: executableCalls,
    ...(dataSuffix ? { dataSuffix } : {}),
  });
  const txHash = await waitForUserOperationComplete({
    smartAccount,
    userOpHash: signupUserOp.userOpHash,
    label: "Farcaster signup user operation",
    requireTransactionHash: true,
    createError: (message) => new CliFarcasterUserOperationError(message),
  });

  const fid = await readFidByCustodyAddress({ custodyAddress });
  if (fid === 0n) {
    throw new CliFarcasterUserOperationError(
      "Farcaster signup confirmed but FID was not assigned to custody address"
    );
  }

  return buildFarcasterSignupCompletedResult({
    ownerAddress,
    custodyAddress,
    recoveryAddress,
    fid,
    idGatewayPriceWei: priceWei,
    txHash,
  });
}
