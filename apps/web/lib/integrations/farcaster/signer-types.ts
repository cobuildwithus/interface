export type FarcasterSignerStatus = {
  fid: number | null;
  hasSigner: boolean;
  signerPermissions: string[] | null;
  neynarPermissions: string[] | null;
  neynarStatus: string | null;
  neynarError: string | null;
  updatedAt: string | null;
};
