import "server-only";

import { normalizeEvmAddress as normalizeAddress } from "@cobuild/wire";
import * as jose from "jose";
import { cookies } from "next/headers";
import {
  getFarcasterByVerifiedAddress,
  getProfileMetaByFid,
} from "@/lib/integrations/farcaster/profile";
import type { ErrorLike } from "@/lib/shared/errors";
import {
  type FarcasterAccount,
  type TwitterAccount,
  type LinkedAccount,
  countWalletAccounts,
  isWalletAccount,
  parseLinkedAccountsJson,
  extractAccounts,
  toFarcasterAccount,
  toTwitterAccount,
} from "./linked-accounts";

let cachedKey: CryptoKey | undefined;
let cachedKeySource: string | undefined;
const normalizeVerificationKey = (value: string) => value.replace(/\\n/g, "\n").trim();
const formatError = (error: unknown) =>
  error instanceof Error ? error.message : String(error ?? "");
async function getVerificationKey() {
  const verificationKey = process.env.PRIVY_VERIFICATION_KEY;
  if (!verificationKey) {
    throw new Error("PRIVY_VERIFICATION_KEY is required");
  }
  const normalizedKey = normalizeVerificationKey(verificationKey);
  if (!cachedKey || cachedKeySource !== normalizedKey) {
    cachedKey = await jose.importSPKI(normalizedKey, "ES256");
    cachedKeySource = normalizedKey;
  }
  return cachedKey;
}

function getPrivyAppId(): string {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID?.trim();
  if (!appId) {
    throw new Error("NEXT_PUBLIC_PRIVY_APP_ID is required");
  }
  return appId;
}

async function verifyIdentityToken(): Promise<{ token: string; payload: jose.JWTPayload } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("privy-id-token")?.value;
  if (!token) return null;

  try {
    const verificationKey = await getVerificationKey();
    const { payload } = await jose.jwtVerify(token, verificationKey, {
      issuer: "privy.io",
      audience: getPrivyAppId(),
    });

    if (!payload?.sub) {
      return null;
    }

    return { token, payload };
  } catch (error) {
    console.warn("[auth] privy token verify failed", {
      error: formatError(error as ErrorLike),
    });
    return null;
  }
}

async function parseIdentityToken(): Promise<{
  token: string;
  linkedAccounts: LinkedAccount[];
} | null> {
  const verified = await verifyIdentityToken();
  if (!verified || typeof verified.payload.linked_accounts !== "string") {
    return null;
  }
  const linkedAccounts = parseLinkedAccountsJson(verified.payload.linked_accounts);
  if (!linkedAccounts) {
    return null;
  }

  const walletEntryCount = countWalletAccounts(linkedAccounts);
  const validWalletAccounts = linkedAccounts.filter(isWalletAccount);
  const validWalletCount = validWalletAccounts.length;
  if (walletEntryCount > 1 || validWalletCount !== walletEntryCount) {
    console.warn("[auth] rejecting session with invalid linked wallet accounts");
    return null;
  }
  for (const walletAccount of validWalletAccounts) {
    try {
      normalizeAddress(walletAccount.address, "walletAccount.address");
    } catch {
      console.warn("[auth] rejecting session with invalid linked wallet accounts");
      return null;
    }
  }

  return { token: verified.token, linkedAccounts };
}

export async function getPrivyIdToken(): Promise<string | undefined> {
  const parsed = await parseIdentityToken();
  return parsed?.token;
}

export async function getPrivyLinkedIdentity(): Promise<
  | {
      wallet?: { address: string };
      farcaster?: { fid: number; username?: string; displayName?: string; pfp?: string };
      twitter?: {
        username?: string;
        name?: string;
        profilePictureUrl?: string;
        subject?: string;
      };
    }
  | undefined
> {
  const parsed = await parseIdentityToken();
  if (!parsed) return undefined;
  const { wallet, farcaster, twitter } = extractAccounts(parsed.linkedAccounts);
  return {
    wallet: wallet?.address ? { address: wallet.address } : undefined,
    farcaster: farcaster
      ? {
          fid: farcaster.fid,
          username: farcaster.username,
          displayName: farcaster.displayName,
          pfp: farcaster.pfp,
        }
      : undefined,
    twitter: twitter
      ? {
          username: twitter.username,
          name: twitter.name,
          profilePictureUrl: twitter.profilePictureUrl,
          subject: twitter.subject,
        }
      : undefined,
  };
}

type Session = {
  address?: `0x${string}`;
  farcaster?: FarcasterAccount;
  twitter?: TwitterAccount;
};

/**
 * Get the full user session from the Privy cookie.
 * Parses the JWT once and returns address + linked accounts.
 */
export async function getSession(): Promise<Session> {
  const parsed = await parseIdentityToken();
  if (!parsed) return {};

  const { wallet, farcaster: privyFarcaster, twitter } = extractAccounts(parsed.linkedAccounts);

  const address = wallet?.address ? normalizeAddress(wallet.address, "wallet.address") : undefined;

  let farcaster: FarcasterAccount | undefined;
  if (privyFarcaster) {
    const meta = await getProfileMetaByFid(privyFarcaster.fid);
    const neynarScore = meta?.neynarScore ?? null;
    farcaster = toFarcasterAccount(privyFarcaster, "privy", neynarScore, meta?.bio);
  } else if (wallet?.address) {
    const verifiedProfile = await getFarcasterByVerifiedAddress(wallet.address);
    if (verifiedProfile) {
      farcaster = toFarcasterAccount(
        verifiedProfile,
        "verified_address",
        verifiedProfile.neynarScore
      );
    }
  }

  return {
    address,
    farcaster,
    twitter: twitter ? toTwitterAccount(twitter) : undefined,
  };
}

/**
 * Get the user's wallet address from the Privy cookie.
 * Only parses the JWT - no DB queries.
 */
export async function getUser(): Promise<`0x${string}` | undefined> {
  const parsed = await parseIdentityToken();
  if (!parsed) return undefined;

  const { wallet } = extractAccounts(parsed.linkedAccounts);
  if (!wallet?.address) return undefined;

  return normalizeAddress(wallet.address, "wallet.address");
}
