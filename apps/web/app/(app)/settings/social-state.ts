import "server-only";

import {
  resolveFarcasterAccount,
  resolveXAccount,
  toLinkedAccountsServerView,
  type ResolvedFarcasterAccount,
  type ResolvedXAccount,
} from "@/lib/domains/auth/linked-accounts/server-view";
import type { LinkedAccountsResponse } from "@/lib/domains/auth/linked-accounts/types";
import type { FarcasterSignerStatus } from "@/lib/integrations/farcaster/signer-types";
import { getProfile } from "@/lib/domains/profile/get-profile";
import { getAuthIdentityKey } from "@/lib/hooks/query-keys";
import { getFarcasterProfileInfo } from "@/lib/server/farcaster-profile-info";
import { getFarcasterSignerStatus } from "@/lib/server/farcaster-signer-status";
import { getLinkedAccountsResponse } from "@/lib/server/linked-accounts-response";
import type { Session } from "@/lib/server/session-types";
import {
  normalizeText,
  pickFirst,
  toProfileSource,
  type ProfileSource,
} from "./farcaster-profile-settings/utils";

type SettingsResolvedProfile = {
  username: string | null;
  displayName: string;
  pfpUrl: string;
  hasFarcasterAccount: boolean;
};

export type SettingsSocialState = {
  linkedAccountsResponse: LinkedAccountsResponse;
  signerStatus: FarcasterSignerStatus;
  initialSignerIdentityKey: string;
  farcasterAccount: ResolvedFarcasterAccount | null;
  twitterAccount: ResolvedXAccount | null;
  resolvedProfile: SettingsResolvedProfile;
};

export async function loadSettingsSocialState(session: Session): Promise<SettingsSocialState> {
  const address = session.address ?? null;
  const linkedAccountsResponse = await getLinkedAccountsResponse(address, { usePrimary: true });
  const linkedAccounts = toLinkedAccountsServerView(linkedAccountsResponse);
  const [signerStatus, profileInfo, profile] = await Promise.all([
    getFarcasterSignerStatus(session, {
      linkedAccounts: linkedAccounts.accounts,
      usePrimary: true,
    }),
    getFarcasterProfileInfo(session, {
      linkedAccounts: linkedAccounts.accounts,
      usePrimary: true,
    }).catch(() => ({ fid: null })),
    address ? getProfile(address) : Promise.resolve(null),
  ]);

  const farcasterAccount = resolveFarcasterAccount({
    linkedAccounts: linkedAccounts.accounts,
    sessionFarcaster: session.farcaster,
    detectedFarcaster:
      profile?.farcaster?.fid !== null && profile?.farcaster?.fid !== undefined
        ? {
            fid: profile.farcaster.fid,
            username: profile.farcaster.name ?? undefined,
            avatarUrl: profile.farcaster.avatar ?? undefined,
          }
        : null,
  });
  const twitterAccount = resolveXAccount({
    linkedAccounts: linkedAccounts.accounts,
    sessionTwitter: session.twitter,
  });

  const sources = [
    toResolvedAccountProfileSource(farcasterAccount),
    profileInfo.fid ? toProfileSource(profileInfo) : null,
    session.farcaster ? toProfileSource(session.farcaster) : null,
  ].filter((source): source is ProfileSource => Boolean(source));

  const preferredFid = signerStatus.fid ?? farcasterAccount?.fid ?? sources[0]?.fid ?? null;
  const matchingSources = preferredFid
    ? sources.filter((source) => source.fid === preferredFid)
    : sources;
  const activeSources = matchingSources.length > 0 ? matchingSources : sources;

  const resolvedProfile = {
    username: normalizeText(pickFirst(activeSources.map((source) => source.username))),
    displayName: normalizeText(pickFirst(activeSources.map((source) => source.displayName))) ?? "",
    pfpUrl: normalizeText(pickFirst(activeSources.map((source) => source.pfp))) ?? "",
    hasFarcasterAccount: Boolean(
      signerStatus.fid ?? farcasterAccount?.fid ?? profileInfo.fid ?? session.farcaster?.fid
    ),
  };

  return {
    linkedAccountsResponse,
    signerStatus,
    initialSignerIdentityKey: getAuthIdentityKey({
      address,
      farcasterFid: signerStatus.fid,
    }),
    farcasterAccount,
    twitterAccount,
    resolvedProfile,
  };
}

function toResolvedAccountProfileSource(
  account: ResolvedFarcasterAccount | null
): ProfileSource | null {
  if (!account) {
    return null;
  }

  return {
    fid: account.fid,
    username: normalizeText(account.username),
    displayName: normalizeText(account.displayName),
    pfp: normalizeText(account.avatarUrl),
  };
}
