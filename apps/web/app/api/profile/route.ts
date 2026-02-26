import { getProfile } from "@/lib/domains/profile/get-profile";
import { NextResponse, type NextRequest } from "next/server";
import { isAddress } from "viem";

export const maxDuration = 20;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address")?.trim();

  if (!address) {
    return NextResponse.json({ error: "Missing address param" }, { status: 400 });
  }

  if (!isAddress(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  try {
    const profile = await getProfile(address);
    return NextResponse.json(profile);
  } catch (error) {
    console.error("Failed to fetch profile", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}
