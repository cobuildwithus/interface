import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/domains/auth/session";
import {
  markNotificationsRead,
  NOTIFICATION_WATERMARK_PATTERN,
} from "@/lib/domains/notifications/queries";

function isSameOriginRequest(req: NextRequest): boolean {
  const requestOrigin = req.nextUrl.origin;
  const origin = req.headers.get("origin");
  if (origin && origin !== requestOrigin) return false;

  const referer = req.headers.get("referer");
  if (!origin && referer && !referer.startsWith(requestOrigin)) return false;

  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "same-site") return false;

  return true;
}

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const address = await getUser();
  if (!address) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  let body: { watermark?: unknown };
  try {
    body = (await req.json()) as { watermark?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.watermark !== "string") {
    return NextResponse.json({ ok: false, error: "Invalid watermark." }, { status: 400 });
  }

  if (!NOTIFICATION_WATERMARK_PATTERN.test(body.watermark)) {
    return NextResponse.json({ ok: false, error: "Invalid watermark." }, { status: 400 });
  }

  await markNotificationsRead(address, body.watermark);

  return NextResponse.json(
    { ok: true, readAt: body.watermark },
    { headers: { "cache-control": "no-store" } }
  );
}
