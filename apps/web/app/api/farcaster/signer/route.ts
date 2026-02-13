import { NextResponse } from "next/server";
import { getSession } from "@/lib/domains/auth/session";
import { getFarcasterSignerStatus } from "@/lib/server/farcaster-signer-status";
import type { FarcasterSignerStatus } from "@/lib/integrations/farcaster/signer-types";

export async function GET() {
  const session = await getSession();
  const status = await getFarcasterSignerStatus(session);
  return NextResponse.json<FarcasterSignerStatus>(status);
}
