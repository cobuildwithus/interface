import { NextResponse } from "next/server";
import { buildFarcasterHostedX402PaymentResponse } from "@cobuild/wire";
import { z } from "zod";
import { requireCliBearerAuth } from "@/lib/server/cli/auth";
import {
  CliFarcasterX402SigningError,
  createCliFarcasterX402Payment,
} from "@/lib/server/cli/farcaster-x402";
import { enforceCliFarcasterX402RateLimit } from "@/lib/server/cli/farcaster-x402-rate-limit";
import {
  NO_STORE_HEADERS,
  cliErrorResponse,
  jsonError,
  parseJsonOrEmpty,
} from "@/lib/server/cli/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const X402PaymentRequestSchema = z.object({}).strict();
function x402PaymentErrorResponse(error: unknown) {
  if (error instanceof CliFarcasterX402SigningError) {
    return jsonError(500, error.message);
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const auth = await requireCliBearerAuth(request, {
      requiredScopes: ["wallet:execute"],
    });
    const rateLimit = await enforceCliFarcasterX402RateLimit({
      request,
      ownerAddress: auth.ownerAddress,
      sessionId: auth.sessionId,
      agentKey: auth.agentKey,
    });
    if (!rateLimit.allowed) {
      return jsonError(rateLimit.status, rateLimit.error, {
        extraHeaders: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      });
    }

    X402PaymentRequestSchema.parse(await parseJsonOrEmpty(request));
    const result = await createCliFarcasterX402Payment({
      ownerAddress: auth.ownerAddress,
      agentKey: auth.agentKey,
    });

    return NextResponse.json(buildFarcasterHostedX402PaymentResponse(result), {
      headers: NO_STORE_HEADERS,
    });
  } catch (error) {
    return cliErrorResponse(error, {
      tag: "farcaster][x402-payment",
      extraHandlers: [x402PaymentErrorResponse],
    });
  }
}
