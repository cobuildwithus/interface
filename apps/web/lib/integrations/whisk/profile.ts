import "server-only";

import { truncateAddress } from "@/lib/shared/utils";
import { type Profile, getProfileUrl } from "@/lib/domains/profile/types";
import { queryWhiskGraphQL } from "./client";

interface WhiskIdentity {
  aggregate: { name?: string; avatar?: string; bio?: string };
  farcaster: { name?: string; avatar?: string; bio?: string };
}

const IDENTITY_QUERY = `
  query GetIdentity($address: Address!) {
    identity(address: $address) {
      aggregate { name avatar bio }
      farcaster { name avatar bio }
    }
  }
`;

const IDENTITIES_QUERY = `
  query GetIdentities($addresses: [Address!]!) {
    identities(addresses: $addresses, resolverOrder: farcaster) {
      aggregate { name avatar bio }
      farcaster { name avatar bio }
    }
  }
`;

export async function getProfileFromWhisk(address: string): Promise<Profile | null> {
  try {
    const data = await queryWhiskGraphQL<{ identity: WhiskIdentity }>(IDENTITY_QUERY, { address });
    if (!data) return null;
    return buildProfileFromWhisk(address, data.identity);
  } catch (error) {
    console.error("Whisk profile error:", error);
    return null;
  }
}

export async function getProfilesFromWhisk(addresses: string[]): Promise<Profile[] | null> {
  if (addresses.length === 0) return [];
  try {
    const data = await queryWhiskGraphQL<{ identities: WhiskIdentity[] }>(IDENTITIES_QUERY, {
      addresses,
    });
    if (!data) return null;
    return data.identities.map((identity, i) => buildProfileFromWhisk(addresses[i], identity));
  } catch (error) {
    console.error("Whisk profiles error:", error);
    return null;
  }
}

function buildProfileFromWhisk(address: string, identity: WhiskIdentity | undefined): Profile {
  const { aggregate, farcaster } = identity ?? {};

  return {
    address,
    name: farcaster?.name || aggregate?.name || truncateAddress(address),
    avatar: farcaster?.avatar || aggregate?.avatar || null,
    bio: farcaster?.bio || aggregate?.bio || null,
    farcaster: {
      fid: null,
      name: farcaster?.name || null,
      avatar: farcaster?.avatar || null,
      bio: farcaster?.bio || null,
      neynarUserScore: null,
    },
    url: getProfileUrl(address, farcaster?.name),
  };
}
