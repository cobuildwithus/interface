import { NextResponse } from "next/server";
import { getCobuildAiContext } from "@/lib/domains/goals/ai-context/context";

export async function GET() {
  const payload = await getCobuildAiContext();

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "public, s-maxage=900, stale-while-revalidate=300",
    },
  });
}
