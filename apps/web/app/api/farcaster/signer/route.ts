import { NextResponse } from "next/server";
import { getSession } from "@/lib/domains/auth/session";
import { getFarcasterSignerStatus } from "@/lib/server/farcaster-signer-status";
import { getLinkedAccountsServerView } from "@/lib/server/linked-accounts-response";
import type { FarcasterSignerStatus } from "@/lib/integrations/farcaster/signer-types";

export async function GET() {
  const session = await getSession();
  const linkedAccounts = await getLinkedAccountsServerView(session.address ?? null, {
    usePrimary: true,
  });
  const status = await getFarcasterSignerStatus(session, {
    linkedAccounts: linkedAccounts.accounts,
    usePrimary: true,
  });
  return NextResponse.json<FarcasterSignerStatus>(status);
}
