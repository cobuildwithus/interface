import { NextResponse } from "next/server";
import { getUser } from "@/lib/domains/auth/session";
import { getLinkedAccountsResponse } from "@/lib/server/linked-accounts-response";
import type { LinkedAccountsResponse } from "@/lib/domains/auth/linked-accounts/types";

export async function GET() {
  const address = await getUser();
  const response = await getLinkedAccountsResponse(address ?? null, { usePrimary: true });
  return NextResponse.json<LinkedAccountsResponse>(response);
}
