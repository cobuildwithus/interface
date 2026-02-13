import { NextResponse } from "next/server";
import { getRevnetData } from "@/lib/domains/token/onchain/revnet-data";
import { COBUILD_PROJECT_ID } from "@/lib/domains/token/onchain/revnet";

function parseProjectId(value: string | null) {
  if (!value) return COBUILD_PROJECT_ID;
  if (!/^\d+$/.test(value)) return null;
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const projectId = parseProjectId(new URL(request.url).searchParams.get("projectId"));
  if (!projectId) {
    return NextResponse.json({ error: "Invalid projectId" }, { status: 400 });
  }

  try {
    const data = await getRevnetData(projectId);
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("[revnet] Failed to fetch data:", error);
    return NextResponse.json({ error: "Failed to fetch revnet data" }, { status: 500 });
  }
}
