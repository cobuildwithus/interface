import "server-only";

import { createHash } from "crypto";
import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchChatApi } from "@/lib/domains/chat/server-api";
import { requireBuildBotBearerAuth } from "@/lib/server/build-bot/auth";
import { BuildBotAuthError } from "@/lib/server/build-bot/errors";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
} as const;

const BUILD_BOT_TOOLS_RATE_LIMIT_WINDOW_SECONDS = 60;
const BUILD_BOT_TOOLS_RATE_LIMIT_MAX = process.env.NODE_ENV === "production" ? 120 : 600;
const BUILD_BOT_TOOLS_RATE_LIMIT_ERROR = "Too many Build Bot tool requests. Please retry shortly.";
const BUILD_BOT_TOOLS_RATE_LIMIT_UNAVAILABLE_ERROR =
  "Build Bot tool rate limiting is temporarily unavailable. Please retry.";

class RequestValidationError extends Error {}

type RateLimitDecision = {
  allowed: boolean;
  resetAt: number;
};

type RateLimitResult =
  | {
      allowed: true;
    }
  | {
      allowed: false;
      status: 429 | 503;
      error: string;
      retryAfterSeconds: number;
    };

type BuildBotToolsProxyOptions<T> = {
  request: Request;
  schema: z.ZodType<T>;
  upstreamPath: string;
};

type RateLimitCounter = {
  count: number;
  windowStart: number;
};

function hashRateKey(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function readClientIpFromHeaders(headers: Headers): string | null {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const cfIp = headers.get("cf-connecting-ip")?.trim();
  if (cfIp) return cfIp;

  return null;
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

async function checkRateLimit(rawKey: string, now: number): Promise<RateLimitDecision> {
  const key = `buildbot:proxy:rate-limit:${hashRateKey(rawKey)}`;
  const nowSeconds = Math.floor(now / 1000);
  const windowStart = nowSeconds - (nowSeconds % BUILD_BOT_TOOLS_RATE_LIMIT_WINDOW_SECONDS);
  const resetAt = (windowStart + BUILD_BOT_TOOLS_RATE_LIMIT_WINDOW_SECONDS) * 1000;
  const ttlSeconds = Math.max(1, Math.ceil((resetAt - now) / 1000));

  const existing = await kv.get<RateLimitCounter>(key);
  if (!existing || existing.windowStart !== windowStart) {
    await kv.set(key, { count: 1, windowStart }, { ex: BUILD_BOT_TOOLS_RATE_LIMIT_WINDOW_SECONDS });
    return { allowed: true, resetAt };
  }

  const next = existing.count + 1;
  if (next > BUILD_BOT_TOOLS_RATE_LIMIT_MAX) {
    return { allowed: false, resetAt };
  }

  await kv.set(key, { count: next, windowStart }, { ex: ttlSeconds });
  return { allowed: true, resetAt };
}

async function enforceRouteRateLimit(params: {
  request: Request;
  ownerAddress: `0x${string}`;
  agentKey: string;
  upstreamPath: string;
}): Promise<RateLimitResult> {
  const ip = readClientIpFromHeaders(params.request.headers) ?? "unknown";
  const principal = `${params.ownerAddress}:${params.agentKey}`;
  const now = Date.now();
  const baseKey = params.upstreamPath.trim().toLowerCase();

  try {
    const [principalDecision, ipDecision] = await Promise.all([
      checkRateLimit(`${baseKey}|principal:${principal}`, now),
      checkRateLimit(`${baseKey}|ip:${ip}`, now),
    ]);

    if (principalDecision.allowed && ipDecision.allowed) {
      return { allowed: true };
    }

    const resetAt = Math.max(principalDecision.resetAt, ipDecision.resetAt);
    const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - now) / 1000));
    return {
      allowed: false,
      status: 429,
      error: BUILD_BOT_TOOLS_RATE_LIMIT_ERROR,
      retryAfterSeconds,
    };
  } catch (error) {
    console.error("[buildbot-tools][proxy] rate limit failed", error);
    return {
      allowed: false,
      status: 503,
      error: BUILD_BOT_TOOLS_RATE_LIMIT_UNAVAILABLE_ERROR,
      retryAfterSeconds: BUILD_BOT_TOOLS_RATE_LIMIT_WINDOW_SECONDS,
    };
  }
}

function toErrorResponse(error: unknown): Response {
  if (error instanceof BuildBotAuthError) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: error.status, headers: NO_STORE_HEADERS }
    );
  }

  if (error instanceof RequestValidationError) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid request body",
        details: z.flattenError(error),
      },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  console.error("[buildbot-tools][proxy] unexpected error", error);
  return NextResponse.json(
    { ok: false, error: "Internal error" },
    { status: 500, headers: NO_STORE_HEADERS }
  );
}

async function toProxyResponse(upstreamResponse: Response): Promise<Response> {
  const body = await upstreamResponse.text();
  const headers = new Headers(upstreamResponse.headers);
  headers.delete("content-length");

  return new Response(body, {
    status: upstreamResponse.status,
    headers,
  });
}

export async function proxyBuildBotToolsRequest<T>(
  options: BuildBotToolsProxyOptions<T>
): Promise<Response> {
  try {
    const auth = await requireBuildBotBearerAuth(options.request);
    const parsed = options.schema.parse(await parseJsonOrEmpty(options.request));

    const rateLimit = await enforceRouteRateLimit({
      request: options.request,
      ownerAddress: auth.ownerAddress,
      agentKey: auth.agentKey,
      upstreamPath: options.upstreamPath,
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { ok: false, error: rateLimit.error },
        {
          status: rateLimit.status,
          headers: {
            ...NO_STORE_HEADERS,
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        }
      );
    }

    try {
      const upstream = await fetchChatApi(options.upstreamPath, {
        headers: { "content-type": "application/json" },
        init: {
          method: "POST",
          body: JSON.stringify(parsed),
          cache: "no-store",
        },
      });
      return toProxyResponse(upstream);
    } catch (error) {
      console.error("[buildbot-tools][proxy] upstream request failed", error);
      return NextResponse.json(
        { ok: false, error: "Upstream request failed." },
        { status: 502, headers: NO_STORE_HEADERS }
      );
    }
  } catch (error) {
    return toErrorResponse(error);
  }
}
