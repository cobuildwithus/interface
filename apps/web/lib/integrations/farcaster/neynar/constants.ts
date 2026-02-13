export const NEYNAR_API_BASE = "https://api.neynar.com/v2/farcaster";
export const NEYNAR_ACCEPT_HEADERS = { accept: "application/json" } as const;
export const NEYNAR_JSON_HEADERS = {
  ...NEYNAR_ACCEPT_HEADERS,
  "content-type": "application/json",
} as const;

export function getNeynarApiKey(): string | undefined {
  return process.env.NEYNAR_API_KEY;
}

export function getNeynarWalletId(): string | undefined {
  return process.env.NEYNAR_WALLET_ID;
}
