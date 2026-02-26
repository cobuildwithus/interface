import { NextResponse, type NextRequest } from "next/server";

const normalizeHeader = (value: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

export async function GET(request: NextRequest) {
  const country = normalizeHeader(request.headers.get("x-vercel-ip-country"));
  const countryRegion = normalizeHeader(request.headers.get("x-vercel-ip-country-region"));

  return NextResponse.json(
    {
      country,
      countryRegion,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
