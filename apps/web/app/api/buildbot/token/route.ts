import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrivyIdToken } from "@/lib/domains/auth/session";
import { fetchChatApi } from "@/lib/domains/chat/server-api";
import { requireBuildBotSessionAddress } from "@/lib/server/build-bot/auth";
import { BuildBotAuthError } from "@/lib/server/build-bot/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

class RequestValidationError extends Error {}
class UpstreamRequestError extends Error {}

const CreateTokenSchema = z.object({
  label: z.string().trim().min(1).max(128).optional(),
  agentKey: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(
      /^[A-Za-z0-9._-]+$/,
      "agentKey must contain only letters, numbers, dots, underscores, or dashes"
    )
    .optional(),
  canWrite: z.boolean().optional(),
});

const RevokeTokenSchema = z.object({
  tokenId: z.string().trim().min(1),
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

function toErrorResponse(error: unknown) {
  if (error instanceof BuildBotAuthError) {
    return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
  }

  if (error instanceof RequestValidationError) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  if (error instanceof UpstreamRequestError) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 502 });
  }

  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid request body",
        details: error.flatten(),
      },
      { status: 400 }
    );
  }

  console.error("[build-bot][token] unexpected error", error);
  return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
}

async function parseJsonOrEmpty(request: Request): Promise<unknown> {
  const rawBody = await request.text();
  if (!rawBody.trim()) {
    return {};
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    throw new RequestValidationError("Invalid JSON body");
  }
}

async function proxyTokensRequest(init: RequestInit): Promise<Response> {
  const identityToken = await getPrivyIdToken();
  if (!identityToken) {
    throw new BuildBotAuthError(401, "Unauthorized");
  }

  let upstream: Response;
  try {
    upstream = await fetchChatApi("/v1/tokens", {
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
    await requireBuildBotSessionAddress();
    return await proxyTokensRequest({
      method: "GET",
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const forbiddenResponse = forbiddenCrossOriginResponse(request);
    if (forbiddenResponse) {
      return forbiddenResponse;
    }

    await requireBuildBotSessionAddress();
    const input = CreateTokenSchema.parse(await parseJsonOrEmpty(request));
    return await proxyTokensRequest({
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(input),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const forbiddenResponse = forbiddenCrossOriginResponse(request);
    if (forbiddenResponse) {
      return forbiddenResponse;
    }

    await requireBuildBotSessionAddress();
    const input = RevokeTokenSchema.parse(await parseJsonOrEmpty(request));
    return await proxyTokensRequest({
      method: "DELETE",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(input),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
