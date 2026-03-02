import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBuildBotBearerAuth } from "@/lib/server/build-bot/auth";
import {
  BuildBotAuthError,
  BuildBotConfigError,
  BuildBotPolicyError,
} from "@/lib/server/build-bot/errors";
import {
  BuildBotFarcasterX402SigningError,
  createBuildBotFarcasterX402Payment,
} from "@/lib/server/build-bot/farcaster-x402";
import { enforceBuildBotFarcasterX402RateLimit } from "@/lib/server/build-bot/farcaster-x402-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

class RequestValidationError extends Error {}

const X402PaymentRequestSchema = z.object({});

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
} as const;

function jsonError(
  status: number,
  error: string,
  details?: unknown,
  extraHeaders?: Record<string, string>
) {
  return NextResponse.json(
    details
      ? {
          ok: false,
          error,
          details,
        }
      : { ok: false, error },
    { status, headers: { ...NO_STORE_HEADERS, ...(extraHeaders ?? {}) } }
  );
}

function toErrorResponse(error: unknown) {
  if (error instanceof BuildBotAuthError) {
    return jsonError(error.status, error.message);
  }

  if (error instanceof BuildBotConfigError) {
    return jsonError(503, error.message);
  }

  if (error instanceof BuildBotPolicyError) {
    return jsonError(403, error.message);
  }

  if (error instanceof BuildBotFarcasterX402SigningError) {
    return jsonError(500, error.message);
  }

  if (error instanceof RequestValidationError) {
    return jsonError(400, error.message);
  }

  if (error instanceof z.ZodError) {
    return jsonError(400, "Invalid request body", error.flatten());
  }

  console.error("[build-bot][farcaster][x402-payment] unexpected error", error);
  return jsonError(500, "Internal error");
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

export async function POST(request: Request) {
  try {
    const auth = await requireBuildBotBearerAuth(request);
    const rateLimit = await enforceBuildBotFarcasterX402RateLimit({
      request,
      ownerAddress: auth.ownerAddress,
      tokenId: auth.tokenId,
      agentKey: auth.agentKey,
    });
    if (!rateLimit.allowed) {
      return jsonError(rateLimit.status, rateLimit.error, undefined, {
        "Retry-After": String(rateLimit.retryAfterSeconds),
      });
    }

    X402PaymentRequestSchema.parse(await parseJsonOrEmpty(request));
    const result = await createBuildBotFarcasterX402Payment({
      ownerAddress: auth.ownerAddress,
      agentKey: auth.agentKey,
    });

    return NextResponse.json(
      {
        ok: true,
        result: {
          ...result,
          agentKey: auth.agentKey,
        },
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
