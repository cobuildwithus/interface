import { NextResponse } from "next/server";
import { getEthPriceUsdc } from "@/lib/domains/token/onchain/eth-price";

export async function GET() {
  const priceUsdc = await getEthPriceUsdc();

  return NextResponse.json(
    { priceUsdc },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      },
    }
  );
}
