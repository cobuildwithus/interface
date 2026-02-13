import "server-only";

import { revalidateTag } from "next/cache";
import { bytesToHex, hexToBytes, isAddress } from "viem";
import { mnemonicToAccount } from "viem/accounts";
import { optimism } from "viem/chains";
import { ViemLocalEip712Signer } from "@farcaster/core";
import { getClient } from "@/lib/domains/token/onchain/clients";
import { ID_REGISTRY_ABI, ID_REGISTRY_ADDRESS } from "@/lib/integrations/farcaster/id-registry";
import {
  getNeynarWalletId,
  neynarCreateSigner,
  neynarGetFreshAccountFid,
  neynarRegisterAccount,
} from "@/lib/integrations/farcaster/neynar-client";
import {
  isValidFarcasterUsername,
  normalizeFarcasterUsername,
} from "@/lib/integrations/farcaster/fname";
import { getFidsByUsernames } from "@/lib/integrations/farcaster/profile";
import { saveVerifiedAddressForFid } from "@/lib/integrations/farcaster/save-verified-address";
import { setSignerRecord } from "@/lib/integrations/farcaster/signer-store";
import {
  getSignerStatusCacheTag,
  getSignerStatusUuidCacheTag,
} from "@/lib/integrations/farcaster/signer-status";
import { upsertLinkedAccount } from "@/lib/domains/auth/linked-accounts/store";
import type {
  RegisterCompleteResponse,
  RegisterInitResponse,
} from "@/lib/integrations/farcaster/register-types";
import { type Result } from "@/lib/server/result";
import { normalizeAddress } from "@/lib/shared/address";
import { isRecord } from "@/lib/server/validation";
import type { Session } from "@/lib/server/session-types";
import type { JsonRecord, JsonValue } from "@/lib/shared/json";

type InitBody = {
  custodyAddress?: string;
};

type CompleteBody = {
  fid?: number;
  signature?: string;
  custodyAddress?: string;
  deadline?: number;
  fname?: string;
  metadata?: JsonRecord;
};

function isHexSignature(value: string | undefined): value is `0x${string}` {
  return typeof value === "string" && value.startsWith("0x") && value.length > 10;
}

export async function initFarcasterRegistration(
  session: Session,
  body: JsonValue | null | undefined
): Promise<Result<RegisterInitResponse>> {
  if (!session.address) {
    return {
      ok: false,
      status: 401,
      error: "Connect a wallet before creating a Farcaster account.",
    };
  }

  if (session.farcaster?.fid) {
    return { ok: false, status: 400, error: "Farcaster is already linked to this account." };
  }

  if (!isRecord(body)) {
    return { ok: false, status: 400, error: "Invalid JSON body." };
  }

  const custodyAddress = (body as InitBody).custodyAddress?.trim();
  if (!custodyAddress || !isAddress(custodyAddress)) {
    return { ok: false, status: 400, error: "Invalid custody address." };
  }

  const normalized = normalizeAddress(custodyAddress);
  if (normalizeAddress(session.address) !== normalized) {
    return { ok: false, status: 403, error: "Custody address does not match session wallet." };
  }

  const walletId = getNeynarWalletId();
  if (!walletId) {
    return { ok: false, status: 500, error: "Neynar wallet ID not configured." };
  }

  const fidResult = await neynarGetFreshAccountFid(walletId);
  if (!fidResult.ok) {
    return { ok: false, status: 502, error: fidResult.error };
  }

  const client = getClient(optimism.id);
  const nonce = await client.readContract({
    address: ID_REGISTRY_ADDRESS,
    abi: ID_REGISTRY_ABI,
    functionName: "nonces",
    args: [normalized],
  });

  const now = Math.floor(Date.now() / 1000);
  const deadline = now + 10 * 60;

  const typedData: RegisterInitResponse["typedData"] = {
    domain: {
      name: "Farcaster IdRegistry",
      version: "1",
      chainId: optimism.id,
      verifyingContract: ID_REGISTRY_ADDRESS,
    },
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
      ],
      Transfer: [
        { name: "fid", type: "uint256" },
        { name: "to", type: "address" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    },
    primaryType: "Transfer",
    message: {
      fid: String(fidResult.fid),
      to: normalized,
      nonce: nonce.toString(),
      deadline: String(deadline),
    },
  };

  return {
    ok: true,
    data: {
      fid: fidResult.fid,
      deadline,
      typedData,
    },
  };
}

export async function completeFarcasterRegistration(
  session: Session,
  body: JsonValue | null | undefined
): Promise<Result<RegisterCompleteResponse>> {
  if (!session.address) {
    return {
      ok: false,
      status: 401,
      error: "Connect a wallet before creating a Farcaster account.",
    };
  }

  if (session.farcaster?.fid) {
    return { ok: false, status: 400, error: "Farcaster is already linked to this account." };
  }

  if (!isRecord(body)) {
    return { ok: false, status: 400, error: "Invalid JSON body." };
  }

  const payload = body as CompleteBody;
  const custodyAddress = payload.custodyAddress?.trim();
  if (!custodyAddress || !isAddress(custodyAddress)) {
    return { ok: false, status: 400, error: "Invalid custody address." };
  }

  const normalizedAddress = normalizeAddress(custodyAddress);
  if (normalizeAddress(session.address) !== normalizedAddress) {
    return { ok: false, status: 403, error: "Custody address does not match session wallet." };
  }

  const fid = payload.fid;
  if (!Number.isFinite(fid) || !fid || fid <= 0) {
    return { ok: false, status: 400, error: "Invalid fid." };
  }

  if (!isHexSignature(payload.signature)) {
    return { ok: false, status: 400, error: "Invalid signature." };
  }

  const deadline = payload.deadline;
  if (!Number.isFinite(deadline) || !deadline || deadline <= 0) {
    return { ok: false, status: 400, error: "Invalid deadline." };
  }
  if (deadline < Math.floor(Date.now() / 1000)) {
    return { ok: false, status: 400, error: "Signature has expired. Please try again." };
  }

  const username = normalizeFarcasterUsername(payload.fname ?? "");
  if (!username || !isValidFarcasterUsername(username)) {
    return { ok: false, status: 400, error: "Invalid Farcaster username." };
  }

  const { fids } = await getFidsByUsernames([username]);
  if (fids.length > 0) {
    return { ok: false, status: 409, error: "Username is already taken." };
  }

  const walletId = getNeynarWalletId();
  if (!walletId) {
    return { ok: false, status: 500, error: "Neynar wallet ID not configured." };
  }

  const appFidRaw = process.env.FARCASTER_APP_FID;
  const appMnemonic = process.env.FARCASTER_APP_MNEMONIC;
  const appFid = appFidRaw ? Number.parseInt(appFidRaw, 10) : NaN;
  if (!Number.isFinite(appFid) || appFid <= 0 || !appMnemonic) {
    return { ok: false, status: 500, error: "Farcaster app signer not configured." };
  }

  const signerResult = await neynarCreateSigner();
  if (!signerResult.ok) {
    return {
      ok: false,
      status: signerResult.status ?? 502,
      error: signerResult.error,
    };
  }

  const signerDeadline = Math.floor(Date.now() / 1000) + 60 * 60;
  const signerAccount = mnemonicToAccount(appMnemonic);
  const signer = new ViemLocalEip712Signer(signerAccount);
  const keyBytes = hexToBytes(signerResult.publicKey);
  const signedMetadata = await signer.getSignedKeyRequestMetadata({
    requestFid: BigInt(appFid),
    key: keyBytes,
    deadline: BigInt(signerDeadline),
  });

  if (!signedMetadata.isOk()) {
    return { ok: false, status: 500, error: "Failed to sign managed signer metadata." };
  }

  const signedKeyRequestMetadataSignature = bytesToHex(signedMetadata.value);

  const registerResult = await neynarRegisterAccount(
    {
      signature: payload.signature,
      fid,
      requested_user_custody_address: normalizedAddress,
      deadline,
      fname: username,
      signer: {
        uuid: signerResult.signerUuid,
        signed_key_request_metadata_signature: signedKeyRequestMetadataSignature,
        app_fid: appFid,
        deadline: signerDeadline,
      },
      ...(payload.metadata ? { metadata: payload.metadata } : {}),
    },
    walletId
  );

  if (!registerResult.ok) {
    return {
      ok: false,
      status: registerResult.status ?? 502,
      error: registerResult.error,
    };
  }

  const signerPermissions = signerResult.permissions ?? ["write_all"];
  await setSignerRecord({
    fid,
    signerUuid: signerResult.signerUuid,
    signerPermissions,
  });

  await upsertLinkedAccount({
    ownerAddress: normalizedAddress,
    platform: "farcaster",
    platformId: String(fid),
    username,
    displayName: null,
    avatarUrl: null,
    source: "neynar_signer",
    canPost: true,
  });

  await saveVerifiedAddressForFid(fid, normalizedAddress);
  revalidateTag("farcaster-profile", "default");
  revalidateTag("profile-v4", "default");
  revalidateTag(getSignerStatusCacheTag(fid), "default");
  revalidateTag(getSignerStatusUuidCacheTag(signerResult.signerUuid), "default");

  return { ok: true, data: { fid, username, signerUuid: signerResult.signerUuid } };
}
