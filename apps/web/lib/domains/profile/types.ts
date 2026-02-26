import { getFarcasterProfileUrl } from "@/lib/integrations/farcaster/urls";

export interface Profile {
  address: string;
  name: string;
  avatar: string | null;
  bio: string | null;
  farcaster: {
    fid: number | null;
    name: string | null;
    avatar: string | null;
    bio: string | null;
    neynarUserScore: number | null;
  };
  url: string;
}

export function getProfileUrl(address: string, farcasterName: string | null | undefined): string {
  return farcasterName
    ? getFarcasterProfileUrl(farcasterName)
    : `https://basescan.org/address/${address}`;
}
