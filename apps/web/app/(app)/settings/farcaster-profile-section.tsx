import { getSession } from "@/lib/domains/auth/session";
import { getFarcasterProfileInfo } from "@/lib/server/farcaster-profile-info";
import { getFarcasterSignerStatus } from "@/lib/server/farcaster-signer-status";
import { getLinkedAccountsResponse } from "@/lib/server/linked-accounts-response";
import { FarcasterProfileSettings } from "./farcaster-profile-settings";
import {
  normalizeText,
  pickFirst,
  toLinkedAccountSource,
  toProfileSource,
  type ProfileSource,
} from "./farcaster-profile-settings/utils";

const EMPTY_SIGNER_STATUS = {
  fid: null,
  hasSigner: false,
  signerPermissions: null,
  neynarPermissions: null,
  neynarStatus: null,
  neynarError: null,
  updatedAt: null,
};

export async function FarcasterProfileSection() {
  const session = await getSession();
  const isLoggedOut = !session.address && !session.farcaster && !session.twitter;
  if (isLoggedOut) {
    return null;
  }
  const address = session.address ?? null;
  const linkedAccountsPromise = getLinkedAccountsResponse(address, { usePrimary: true });
  const signerStatusPromise = getFarcasterSignerStatus(session);

  const [linkedAccountsResult, signerStatusResult] = await Promise.allSettled([
    linkedAccountsPromise,
    signerStatusPromise,
  ]);

  const linkedAccounts =
    linkedAccountsResult.status === "fulfilled"
      ? linkedAccountsResult.value
      : { address: null, accounts: [] };
  const signerStatus =
    signerStatusResult.status === "fulfilled" ? signerStatusResult.value : EMPTY_SIGNER_STATUS;

  const profileInfo = await getFarcasterProfileInfo(session, {
    linkedAccounts: linkedAccounts.accounts,
  }).catch(() => ({ fid: null }));

  const farcasterAccounts = linkedAccounts.accounts.filter(
    (account) => account.platform === "farcaster"
  );
  const preferredAccount =
    farcasterAccounts.find((account) => account.source === "neynar_signer" || account.canPost) ??
    farcasterAccounts[0] ??
    null;
  const linkedSource = toLinkedAccountSource(preferredAccount);

  const sources = [
    profileInfo.fid ? toProfileSource(profileInfo) : null,
    session.farcaster ? toProfileSource(session.farcaster) : null,
    linkedSource,
  ].filter((source): source is ProfileSource => Boolean(source));

  const preferredFid = signerStatus.fid ?? linkedSource?.fid ?? sources[0]?.fid ?? null;
  const matchingSources = preferredFid
    ? sources.filter((source) => source.fid === preferredFid)
    : sources;
  const activeSources = matchingSources.length > 0 ? matchingSources : sources;

  const resolvedProfile = {
    username: pickFirst(activeSources.map((source) => source.username)),
    displayName: pickFirst(activeSources.map((source) => source.displayName)),
    pfp: pickFirst(activeSources.map((source) => source.pfp)),
  };

  const resolvedUsername = normalizeText(resolvedProfile.username)?.replace(/^@/, "") ?? null;
  const resolvedDisplayName = normalizeText(resolvedProfile.displayName) ?? "";
  const resolvedPfpUrl = normalizeText(resolvedProfile.pfp) ?? "";
  const hasFarcasterAccount = Boolean(
    signerStatus.fid ?? linkedSource?.fid ?? profileInfo.fid ?? session.farcaster?.fid
  );

  return (
    <FarcasterProfileSettings
      resolvedUsername={resolvedUsername}
      resolvedDisplayName={resolvedDisplayName}
      resolvedPfpUrl={resolvedPfpUrl}
      canEdit={signerStatus.hasSigner}
      hasFarcasterAccount={hasFarcasterAccount}
    />
  );
}
