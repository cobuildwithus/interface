export type UserResponse = {
  address: `0x${string}` | null;
  farcaster: {
    fid: number;
    username: string | null;
    displayName: string | null;
    pfp: string | null;
    neynarScore: number | null;
  } | null;
  twitter: {
    username: string | null;
    name: string | null;
  } | null;
};
