import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrivyIdToken } from "@/lib/domains/auth/session";
import { fetchChatApi } from "@/lib/domains/chat/server-api";
import { requireCliSessionAddress } from "@/lib/server/cli/auth";
import { CliAuthError } from "@/lib/server/cli/errors";
import { cliErrorResponse, jsonError, parseJsonOrEmpty } from "@/lib/server/cli/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

class UpstreamRequestError extends Error {}

const SessionRevokeSchema = z.object({
  sessionId: z.string().trim().min(1),
});

function isSameOriginRequest(request: Request): boolean {
  const requestOrigin = new URL(request.url).origin;
  const origin = request.headers.get("origin");
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

function forbiddenCrossOriginResponse(request: Request): NextResponse | null {
  if (isSameOriginRequest(request)) return null;
  return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
}

function sessionsErrorResponse(error: unknown) {
  if (error instanceof UpstreamRequestError) {
    return jsonError(502, error.message, { noStore: false });
  }
  return null;
}

async function proxySessionsRequest(init: RequestInit): Promise<Response> {
  const identityToken = await getPrivyIdToken();
  if (!identityToken) {
    throw new CliAuthError(401, "Unauthorized");
  }

  let upstream: Response;
  try {
    upstream = await fetchChatApi("/v1/sessions", {
      identityToken,
      init: {
        ...init,
        cache: "no-store",
      },
    });
  } catch {
    throw new UpstreamRequestError("Upstream request failed.");
  }

  const body = await upstream.text();
  const headers = new Headers(upstream.headers);
  headers.set("Cache-Control", "no-store");
  headers.delete("content-length");
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  return new Response(body, {
    status: upstream.status,
    headers,
  });
}

export async function GET() {
  try {
    await requireCliSessionAddress();
    return await proxySessionsRequest({
      method: "GET",
    });
  } catch (error) {
    return cliErrorResponse(error, {
      tag: "sessions",
      extraHandlers: [sessionsErrorResponse],
      noStore: false,
    });
  }
}

export async function DELETE(request: Request) {
  try {
    const forbiddenResponse = forbiddenCrossOriginResponse(request);
    if (forbiddenResponse) {
      return forbiddenResponse;
    }

    await requireCliSessionAddress();
    const input = SessionRevokeSchema.parse(await parseJsonOrEmpty(request));
    return await proxySessionsRequest({
      method: "DELETE",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(input),
    });
  } catch (error) {
    return cliErrorResponse(error, {
      tag: "sessions",
      extraHandlers: [sessionsErrorResponse],
      noStore: false,
    });
  }
}
