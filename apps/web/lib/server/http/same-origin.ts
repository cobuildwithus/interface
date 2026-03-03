import "server-only";

import { NextResponse } from "next/server";

type SameOriginOptions = {
  requireOriginHeader?: boolean;
};

export function isSameOriginRequest(request: Request, options: SameOriginOptions = {}): boolean {
  const requestOrigin = new URL(request.url).origin;
  const origin = request.headers.get("origin");
  if (options.requireOriginHeader && !origin) return false;
  if (origin && origin !== requestOrigin) return false;

  const referer = request.headers.get("referer");
  if (!origin && referer) {
    try {
      if (new URL(referer).origin !== requestOrigin) return false;
    } catch {
      return false;
    }
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "same-site") return false;

  return true;
}

export function forbiddenCrossOriginResponse(
  request: Request,
  options: SameOriginOptions = {}
): NextResponse | null {
  if (isSameOriginRequest(request, options)) return null;
  return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
}
