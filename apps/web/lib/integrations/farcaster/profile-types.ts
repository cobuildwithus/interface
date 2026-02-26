export type FarcasterProfileInfo =
  | {
      fid: number;
      username: string | null;
      displayName: string | null;
      pfp: string | null;
    }
  | { fid: null };
