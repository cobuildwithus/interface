import "server-only";

import { createHash } from "crypto";
import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchChatApi } from "@/lib/domains/chat/server-api";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
} as const;

const BUILD_BOT_TOOLS_RATE_LIMIT_WINDOW_SECONDS = 60;
const BUILD_BOT_TOOLS_RATE_LIMIT_MAX = process.env.NODE_ENV === "production" ? 120 : 600;
const BUILD_BOT_TOOLS_RATE_LIMIT_ERROR = "Too many Build Bot tool requests. Please retry shortly.";
const BUILD_BOT_TOOLS_RATE_LIMIT_UNAVAILABLE_ERROR =
  "Build Bot tool rate limiting is temporarily unavailable. Please retry.";
const BUILD_BOT_TOOLS_RATE_LIMIT_MODE_ENV = "BUILD_BOT_TOOLS_RATE_LIMIT_MODE";
const TOOL_EXECUTIONS_MAX_BODY_BYTES = 64 * 1024;
const TOOL_EXECUTIONS_BODY_TOO_LARGE_ERROR = "Tool execution request body exceeds the 64KB limit.";

class RequestValidationError extends Error {}
class UnauthorizedError extends Error {}
class PayloadTooLargeError extends Error {}

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

type RateLimitFailureMode = "fail-open" | "fail-closed";

type BuildBotToolsProxyOptions<T, U = T> = {
  request: Request;
  schema: z.ZodType<T>;
  upstreamPath: string;
  rateLimitPath?: string;
  toUpstreamBody?: (parsed: T) => U;
  fromUpstreamResponse?: (upstreamResponse: Response) => Promise<Response>;
};

type BuildBotToolsPassthroughProxyOptions = {
  request: Request;
  upstreamPath: string;
  rateLimitPath?: string;
  upstreamMethod: "GET" | "POST";
};

type CanonicalToolExecutionSuccess = {
  ok: true;
  name: string;
  output: unknown;
};

function hashRateKey(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function parseBearerToken(value: string | null): string | null {
  if (!value) return null;
  const match = value.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const token = match[1]?.trim();
  return token && token.length > 0 ? token : null;
}

function getRateLimitTokenHash(headers: Headers): string {
  const token = parseBearerToken(headers.get("authorization"));
  if (!token) {
    throw new UnauthorizedError("Unauthorized");
  }
  return hashRateKey(token);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCanonicalToolExecutionSuccess(value: unknown): value is CanonicalToolExecutionSuccess {
  if (!isRecord(value)) return false;
  if (value.ok !== true) return false;
  if (typeof value.name !== "string") return false;
  return "output" in value;
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

function normalizeRateLimitKey(path: string): string {
  const [pathname] = path.split("?", 1);
  return (pathname ?? path).trim().toLowerCase();
}

function isCanonicalToolExecutionsPath(path: string): boolean {
  return normalizeRateLimitKey(path) === "/v1/tool-executions";
}

function getContentLength(headers: Headers): number | null {
  const raw = headers.get("content-length");
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

async function readRequestTextWithLimit(request: Request, maxBytes?: number): Promise<string> {
  if (maxBytes && maxBytes > 0) {
    const declaredLength = getContentLength(request.headers);
    if (declaredLength !== null && declaredLength > maxBytes) {
      throw new PayloadTooLargeError(TOOL_EXECUTIONS_BODY_TOO_LARGE_ERROR);
    }
  }

  const rawBody = await request.text();
  if (maxBytes && maxBytes > 0) {
    const bodySize = new TextEncoder().encode(rawBody).byteLength;
    if (bodySize > maxBytes) {
      throw new PayloadTooLargeError(TOOL_EXECUTIONS_BODY_TOO_LARGE_ERROR);
    }
  }

  return rawBody;
}

async function checkRateLimit(rawKey: string, now: number): Promise<RateLimitDecision> {
  const nowSeconds = Math.floor(now / 1000);
  const windowStart = nowSeconds - (nowSeconds % BUILD_BOT_TOOLS_RATE_LIMIT_WINDOW_SECONDS);
  const resetAt = (windowStart + BUILD_BOT_TOOLS_RATE_LIMIT_WINDOW_SECONDS) * 1000;
  const key = `buildbot:proxy:rate-limit:${hashRateKey(`${rawKey}|window:${windowStart}`)}`;
  const count = await kv.incr(key);
  if (count === 1) {
    await kv.expire(key, BUILD_BOT_TOOLS_RATE_LIMIT_WINDOW_SECONDS);
  }

  return { allowed: count <= BUILD_BOT_TOOLS_RATE_LIMIT_MAX, resetAt };
}

function getRateLimitFailureMode(): RateLimitFailureMode {
  const configured = process.env[BUILD_BOT_TOOLS_RATE_LIMIT_MODE_ENV]?.trim().toLowerCase();
  if (configured === "fail-open" || configured === "fail-closed") {
    return configured;
  }
  return process.env.NODE_ENV === "production" ? "fail-closed" : "fail-open";
}

async function enforceRouteRateLimit(params: {
  request: Request;
  tokenHash: string;
  upstreamPath: string;
}): Promise<RateLimitResult> {
  const ip = readClientIpFromHeaders(params.request.headers) ?? "unknown";
  const now = Date.now();
  const baseKey = normalizeRateLimitKey(params.upstreamPath);

  try {
    const [tokenDecision, ipDecision] = await Promise.all([
      checkRateLimit(`${baseKey}|token:${params.tokenHash}`, now),
      checkRateLimit(`${baseKey}|ip:${ip}`, now),
    ]);

    if (tokenDecision.allowed && ipDecision.allowed) {
      return { allowed: true };
    }

    const resetAt = Math.max(tokenDecision.resetAt, ipDecision.resetAt);
    const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - now) / 1000));
    return {
      allowed: false,
      status: 429,
      error: BUILD_BOT_TOOLS_RATE_LIMIT_ERROR,
      retryAfterSeconds,
    };
  } catch (error) {
    console.error("[buildbot-tools][proxy] rate limit failed", error);
    if (getRateLimitFailureMode() === "fail-open") {
      return { allowed: true };
    }
    return {
      allowed: false,
      status: 503,
      error: BUILD_BOT_TOOLS_RATE_LIMIT_UNAVAILABLE_ERROR,
      retryAfterSeconds: BUILD_BOT_TOOLS_RATE_LIMIT_WINDOW_SECONDS,
    };
  }
}

function toErrorResponse(error: unknown): Response {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }

  if (error instanceof RequestValidationError) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  if (error instanceof PayloadTooLargeError) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 413, headers: NO_STORE_HEADERS }
    );
  }

  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid request body",
        details: error.flatten(),
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

export function buildCanonicalToolExecutionBody<TInput>(
  name: string,
  input: TInput
): { name: string; input: TInput } {
  return { name, input };
}

export async function mapCanonicalToolExecutionResponse(
  upstreamResponse: Response,
  mapOutput: (output: unknown) => unknown
): Promise<Response> {
  const raw = await upstreamResponse.text();
  const headers = new Headers(upstreamResponse.headers);
  headers.delete("content-length");

  let payload: unknown = null;
  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    return new Response(raw, {
      status: upstreamResponse.status,
      headers,
    });
  }

  if (upstreamResponse.ok && isCanonicalToolExecutionSuccess(payload)) {
    headers.set("content-type", "application/json");
    return new Response(JSON.stringify(mapOutput(payload.output)), {
      status: upstreamResponse.status,
      headers,
    });
  }

  return new Response(raw, {
    status: upstreamResponse.status,
    headers,
  });
}

export async function proxyBuildBotToolsRequest<T, U = T>(
  options: BuildBotToolsProxyOptions<T, U>
): Promise<Response> {
  try {
    const tokenHash = getRateLimitTokenHash(options.request.headers);
    const parsed = options.schema.parse(await parseJsonOrEmpty(options.request));

    const rateLimit = await enforceRouteRateLimit({
      request: options.request,
      tokenHash,
      upstreamPath: options.rateLimitPath ?? options.upstreamPath,
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
      const upstreamBody = options.toUpstreamBody ? options.toUpstreamBody(parsed) : parsed;
      const upstreamHeaders: Record<string, string> = {
        "content-type": "application/json",
      };
      const authorization = options.request.headers.get("authorization");
      if (authorization) {
        upstreamHeaders.authorization = authorization;
      }
      const upstream = await fetchChatApi(options.upstreamPath, {
        headers: upstreamHeaders,
        init: {
          method: "POST",
          body: JSON.stringify(upstreamBody),
          cache: "no-store",
        },
      });
      if (options.fromUpstreamResponse) {
        return options.fromUpstreamResponse(upstream);
      }
      return toProxyResponse(upstream);
    } catch (error) {
      if (error instanceof PayloadTooLargeError) {
        throw error;
      }
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

export async function proxyBuildBotToolsPassthroughRequest(
  options: BuildBotToolsPassthroughProxyOptions
): Promise<Response> {
  try {
    const tokenHash = getRateLimitTokenHash(options.request.headers);

    const rateLimit = await enforceRouteRateLimit({
      request: options.request,
      tokenHash,
      upstreamPath: options.rateLimitPath ?? options.upstreamPath,
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
      const upstreamHeaders: Record<string, string> = {};
      const authorization = options.request.headers.get("authorization");
      if (authorization) {
        upstreamHeaders.authorization = authorization;
      }
      if (options.upstreamMethod === "POST") {
        const contentType = options.request.headers.get("content-type");
        upstreamHeaders["content-type"] = contentType || "application/json";
      }

      const init: RequestInit =
        options.upstreamMethod === "POST"
          ? {
              method: "POST",
              body: await readRequestTextWithLimit(
                options.request,
                isCanonicalToolExecutionsPath(options.rateLimitPath ?? options.upstreamPath)
                  ? TOOL_EXECUTIONS_MAX_BODY_BYTES
                  : undefined
              ),
              cache: "no-store",
            }
          : {
              method: "GET",
              cache: "no-store",
            };

      const upstream = await fetchChatApi(options.upstreamPath, {
        headers: Object.keys(upstreamHeaders).length > 0 ? upstreamHeaders : undefined,
        init,
      });

      return toProxyResponse(upstream);
    } catch (error) {
      if (error instanceof PayloadTooLargeError) {
        throw error;
      }
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
