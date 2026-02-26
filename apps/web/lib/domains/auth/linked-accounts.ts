import type { JsonValue } from "@/lib/shared/json";

type WalletAccount = { type: "wallet"; address: string };
type FarcasterLinkedAccount = {
  type: "farcaster";
  fid: number;
  username?: string;
  displayName?: string;
  pfp?: string;
};
type TwitterLinkedAccount = {
  type: "twitter_oauth";
  username?: string;
  name?: string;
  profilePictureUrl?: string;
  subject?: string;
};
type OtherAccount = { type: string; [key: string]: JsonValue };

export type LinkedAccount =
  | WalletAccount
  | FarcasterLinkedAccount
  | TwitterLinkedAccount
  | OtherAccount;

export type FarcasterAccount = {
  fid: number;
  username?: string;
  displayName?: string;
  pfp?: string;
  bio?: string;
  neynarScore?: number | null;
  source: "privy" | "verified_address";
};

export type TwitterAccount = {
  username?: string;
  name?: string;
  profilePictureUrl?: string;
  subject?: string;
};

type ParsedLinkedAccounts = {
  wallet?: WalletAccount;
  farcaster?: FarcasterLinkedAccount;
  twitter?: TwitterLinkedAccount;
};

export function isWalletAccount(a: LinkedAccount): a is WalletAccount {
  return a.type === "wallet" && typeof (a as WalletAccount).address === "string";
}

export function isFarcasterAccount(a: LinkedAccount): a is FarcasterLinkedAccount {
  return a.type === "farcaster" && typeof (a as FarcasterLinkedAccount).fid === "number";
}

export function isTwitterAccount(a: LinkedAccount): a is TwitterLinkedAccount {
  return a.type === "twitter_oauth";
}

export function parseLinkedAccountsJson(json: string): LinkedAccount[] | undefined {
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return undefined;
    return parsed as LinkedAccount[];
  } catch {
    return undefined;
  }
}

export function extractAccounts(accounts: LinkedAccount[]): ParsedLinkedAccounts {
  return {
    wallet: accounts.find(isWalletAccount),
    farcaster: accounts.find(isFarcasterAccount),
    twitter: accounts.find(isTwitterAccount),
  };
}

export function toFarcasterAccount(
  linked: FarcasterLinkedAccount,
  source: "privy",
  neynarScore?: number | null,
  bio?: string
): FarcasterAccount;
export function toFarcasterAccount(
  profile: {
    fid: number;
    username?: string;
    displayName?: string;
    pfp?: string;
    bio?: string;
  },
  source: "verified_address",
  neynarScore?: number | null
): FarcasterAccount;
export function toFarcasterAccount(
  data: { fid: number; username?: string; displayName?: string; pfp?: string; bio?: string },
  source: "privy" | "verified_address",
  neynarScore?: number | null,
  bio?: string
): FarcasterAccount {
  return {
    fid: data.fid,
    username: data.username,
    displayName: data.displayName,
    pfp: data.pfp,
    bio: data.bio ?? bio,
    neynarScore,
    source,
  };
}

export function toTwitterAccount(linked: TwitterLinkedAccount): TwitterAccount {
  return {
    username: linked.username,
    name: linked.name,
    profilePictureUrl: linked.profilePictureUrl,
    subject: linked.subject,
  };
}
