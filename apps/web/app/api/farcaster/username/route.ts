import { NextRequest, NextResponse } from "next/server";
import { getFidsByUsernames } from "@/lib/integrations/farcaster/profile";
import {
  isValidFarcasterUsername,
  normalizeFarcasterUsername,
} from "@/lib/integrations/farcaster/fname";

type UsernameAvailabilityResponse = {
  username: string;
  available: boolean;
  reason: "available" | "taken" | "invalid";
};

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("username") ?? "";
  const username = normalizeFarcasterUsername(raw);

  if (!username || !isValidFarcasterUsername(username)) {
    return NextResponse.json<UsernameAvailabilityResponse>({
      username,
      available: false,
      reason: "invalid",
    });
  }

  const { fids } = await getFidsByUsernames([username]);
  const available = fids.length === 0;

  return NextResponse.json<UsernameAvailabilityResponse>({
    username,
    available,
    reason: available ? "available" : "taken",
  });
}
