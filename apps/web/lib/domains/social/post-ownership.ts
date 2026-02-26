import type { PostPlatform } from "@/lib/domains/social/platforms";

function normalizeUsername(username: string): string {
  return username.trim().replace(/^@+/, "").toLowerCase();
}

export function getPostOwnershipMismatchError(params: {
  platform: PostPlatform;
  urlUsername: string | null;
  linkedUsername: string | null;
}): string | null {
  const urlUsername = params.urlUsername ? normalizeUsername(params.urlUsername) : "";
  const linkedUsername = params.linkedUsername ? normalizeUsername(params.linkedUsername) : "";
  if (!urlUsername || !linkedUsername) return null;

  if (urlUsername !== linkedUsername) {
    return `This post belongs to @${urlUsername}, not your linked account @${linkedUsername}.`;
  }

  return null;
}
