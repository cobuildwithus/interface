import "server-only";

import { createHash } from "crypto";
import { kv } from "@vercel/kv";

const MINUTE_WINDOW_SECONDS = 60;
const DAY_WINDOW_SECONDS = 24 * 60 * 60;

const DEFAULT_PER_MINUTE = process.env.NODE_ENV === "production" ? 60 : 600;
const DEFAULT_PER_DAY = process.env.NODE_ENV === "production" ? 10_000 : 100_000;

const TOO_MANY_REQUESTS_ERROR = "Too many Farcaster x402 payment requests. Please retry shortly.";
const DAILY_CAP_ERROR = "Daily Farcaster x402 payment cap reached. Please retry tomorrow.";
const UNAVAILABLE_ERROR =
  "Farcaster x402 payment rate limiting is temporarily unavailable. Please retry.";

export type FarcasterX402RateLimitResult =
  | { allowed: true }
  | {
      allowed: false;
      status: 429 | 503;
      error: string;
      retryAfterSeconds: number;
    };

function hashKey(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function parseLimit(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = Number.parseInt(value.trim(), 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function readClientIpFromHeaders(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const cfIp = headers.get("cf-connecting-ip")?.trim();
  if (cfIp) return cfIp;
  return "unknown";
}

async function checkWindow(params: {
  keyPrefix: string;
  rawKey: string;
  nowMs: number;
  windowSeconds: number;
  maxCount: number;
}): Promise<{ allowed: boolean; resetAtMs: number }> {
  const nowSeconds = Math.floor(params.nowMs / 1000);
  const windowStart = nowSeconds - (nowSeconds % params.windowSeconds);
  const resetAtMs = (windowStart + params.windowSeconds) * 1000;
  const key = `${params.keyPrefix}:${hashKey(`${params.rawKey}|window:${windowStart}`)}`;
  const count = await kv.incr(key);
  if (count === 1) {
    await kv.expire(key, params.windowSeconds);
  }

  return { allowed: count <= params.maxCount, resetAtMs };
}

export async function enforceBuildBotFarcasterX402RateLimit(params: {
  request: Request;
  ownerAddress: `0x${string}`;
  tokenId: string;
  agentKey: string;
}): Promise<FarcasterX402RateLimitResult> {
  const perMinute = parseLimit(
    "BUILD_BOT_FARCASTER_X402_RATE_LIMIT_PER_MINUTE",
    DEFAULT_PER_MINUTE
  );
  const perDay = parseLimit("BUILD_BOT_FARCASTER_X402_MAX_CALLS_PER_DAY", DEFAULT_PER_DAY);
  const ip = readClientIpFromHeaders(params.request.headers);
  const nowMs = Date.now();

  const principalKey = `${params.ownerAddress}:${params.agentKey}`;
  const tokenKey = params.tokenId;

  try {
    const [principalMinute, tokenMinute, ipMinute, tokenDaily] = await Promise.all([
      checkWindow({
        keyPrefix: "buildbot:farcaster:x402:minute:principal",
        rawKey: principalKey,
        nowMs,
        windowSeconds: MINUTE_WINDOW_SECONDS,
        maxCount: perMinute,
      }),
      checkWindow({
        keyPrefix: "buildbot:farcaster:x402:minute:token",
        rawKey: tokenKey,
        nowMs,
        windowSeconds: MINUTE_WINDOW_SECONDS,
        maxCount: perMinute,
      }),
      checkWindow({
        keyPrefix: "buildbot:farcaster:x402:minute:ip",
        rawKey: ip,
        nowMs,
        windowSeconds: MINUTE_WINDOW_SECONDS,
        maxCount: perMinute,
      }),
      checkWindow({
        keyPrefix: "buildbot:farcaster:x402:daily:token",
        rawKey: tokenKey,
        nowMs,
        windowSeconds: DAY_WINDOW_SECONDS,
        maxCount: perDay,
      }),
    ]);

    if (!tokenDaily.allowed) {
      return {
        allowed: false,
        status: 429,
        error: DAILY_CAP_ERROR,
        retryAfterSeconds: Math.max(1, Math.ceil((tokenDaily.resetAtMs - nowMs) / 1000)),
      };
    }

    if (!principalMinute.allowed || !tokenMinute.allowed || !ipMinute.allowed) {
      const resetAtMs = Math.max(
        principalMinute.resetAtMs,
        tokenMinute.resetAtMs,
        ipMinute.resetAtMs
      );
      return {
        allowed: false,
        status: 429,
        error: TOO_MANY_REQUESTS_ERROR,
        retryAfterSeconds: Math.max(1, Math.ceil((resetAtMs - nowMs) / 1000)),
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error("[build-bot][farcaster][x402-payment] rate limit failed", error);
    return {
      allowed: false,
      status: 503,
      error: UNAVAILABLE_ERROR,
      retryAfterSeconds: MINUTE_WINDOW_SECONDS,
    };
  }
}
