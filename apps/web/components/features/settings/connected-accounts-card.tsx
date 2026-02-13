import { cn } from "@/lib/shared/utils";
import { getSession } from "@/lib/domains/auth/session";
import { getProfile } from "@/lib/domains/profile/get-profile";
import { getLinkedAccountsResponse } from "@/lib/server/linked-accounts-response";
import { getFarcasterSignerStatus } from "@/lib/server/farcaster-signer-status";
import type { LinkedAccountRecord } from "@/lib/domains/auth/linked-accounts/types";
import type { Session } from "@/lib/server/session-types";
import { ConnectedAccountsActions } from "./connected-accounts-actions";

type ConnectedAccountsCardProps = {
  className?: string;
  session?: Session;
};

type FarcasterAccountInfo = { fid: number; username?: string; displayName?: string };

type TwitterAccountInfo = { username?: string; name?: string };

function toDbFarcasterAccount(
  account: LinkedAccountRecord | undefined
): FarcasterAccountInfo | null {
  if (!account) return null;
  const fid = Number.parseInt(account.platformId, 10);
  if (!Number.isFinite(fid)) return null;
  return {
    fid,
    username: account.username ?? undefined,
    displayName: account.displayName ?? undefined,
  };
}

function toDbTwitterAccount(account: LinkedAccountRecord | undefined): TwitterAccountInfo | null {
  if (!account) return null;
  return {
    username: account.username ?? undefined,
    name: account.displayName ?? undefined,
  };
}

export async function ConnectedAccountsCard({ className, session }: ConnectedAccountsCardProps) {
  const resolvedSession = session ?? (await getSession());
  const address = resolvedSession.address ?? null;

  const [linkedAccountsResponse, profile, signerStatus] = await Promise.all([
    getLinkedAccountsResponse(address, { usePrimary: true }),
    address ? getProfile(address) : Promise.resolve(null),
    getFarcasterSignerStatus(resolvedSession),
  ]);

  const dbFarcasterAccount = toDbFarcasterAccount(
    linkedAccountsResponse.accounts.find((account) => account.platform === "farcaster")
  );
  const dbTwitterAccount = toDbTwitterAccount(
    linkedAccountsResponse.accounts.find((account) => account.platform === "x")
  );

  const sessionFarcaster = resolvedSession.farcaster
    ? {
        fid: resolvedSession.farcaster.fid,
        username: resolvedSession.farcaster.username ?? undefined,
        displayName: resolvedSession.farcaster.displayName ?? undefined,
      }
    : null;

  const profileFarcaster = profile?.farcaster?.fid
    ? {
        fid: profile.farcaster.fid,
        username: profile.farcaster.name ?? undefined,
        displayName: undefined,
      }
    : null;

  const sessionTwitter = resolvedSession.twitter
    ? {
        username: resolvedSession.twitter.username ?? undefined,
        name: resolvedSession.twitter.name ?? undefined,
      }
    : null;

  const farcasterAccount = dbFarcasterAccount ?? sessionFarcaster ?? profileFarcaster;
  const twitterAccount = dbTwitterAccount ?? sessionTwitter;

  const allLinked = Boolean(farcasterAccount) && Boolean(twitterAccount);

  return (
    <div
      className={cn(
        "border-border/60 bg-background/80 relative overflow-hidden rounded-2xl border p-4",
        className
      )}
    >
      <div className="pointer-events-none absolute -top-8 -right-8 h-32 w-32 rounded-full bg-gradient-to-br from-purple-500/10 via-blue-500/5 to-transparent blur-2xl" />

      <div className="relative">
        <h3 className="text-foreground text-sm font-medium">Connected accounts</h3>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {allLinked ? "Your social accounts are linked" : "Link socials to your account"}
        </p>
        <ConnectedAccountsActions
          address={address}
          farcasterAccount={farcasterAccount}
          twitterAccount={twitterAccount}
          signerStatus={signerStatus}
        />
      </div>
    </div>
  );
}
