const FARCASTER_BASE_URL = "https://farcaster.xyz/";
const FARCASTER_CHANNEL_URL = "https://farcaster.xyz/~/channel/";

export function getCastUrl(hash: string): string {
  return `${FARCASTER_BASE_URL}~/conversations/${hash}`;
}

export function getFarcasterProfileUrl(username: string): string {
  return `${FARCASTER_BASE_URL}${username}`;
}

export function getFarcasterChannelUrl(channel: string): string {
  return `${FARCASTER_CHANNEL_URL}${channel}`;
}
