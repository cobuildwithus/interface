import { truncateAddress } from "@/lib/shared/utils";
import { type Profile, getProfileUrl } from "./types";

export function getEmptyProfile(address: string): Profile {
  return {
    address,
    name: truncateAddress(address),
    avatar: null,
    bio: null,
    farcaster: { fid: null, name: null, avatar: null, bio: null, neynarUserScore: null },
    url: getProfileUrl(address, null),
  };
}
