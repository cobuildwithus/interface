export type LinkedAccountPlatform = "farcaster" | "x";
export type LinkedAccountSource = "privy" | "neynar_signer" | "verified_address";

export type LinkedAccountRecord = {
  platform: LinkedAccountPlatform;
  platformId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  source: LinkedAccountSource;
  canPost: boolean;
  updatedAt: string;
};

export type LinkedAccountsResponse = {
  address: string | null;
  accounts: LinkedAccountRecord[];
};
