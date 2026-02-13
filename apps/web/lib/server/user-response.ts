import "server-only";

import type { UserResponse } from "@/lib/domains/auth/user-response-types";
import type { Session } from "./session-types";

export function getUserResponse(session: Session): UserResponse {
  return {
    address: session.address ?? null,
    farcaster: session.farcaster
      ? {
          fid: session.farcaster.fid,
          username: session.farcaster.username ?? null,
          displayName: session.farcaster.displayName ?? null,
          pfp: session.farcaster.pfp ?? null,
          neynarScore: session.farcaster.neynarScore ?? null,
        }
      : null,
    twitter: session.twitter
      ? {
          username: session.twitter.username ?? null,
          name: session.twitter.name ?? null,
        }
      : null,
  };
}
