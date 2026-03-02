import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { z } from "zod";
import { requireBuildBotBearerAuth } from "@/lib/server/build-bot/auth";
import {
  BuildBotAuthError,
  BuildBotConfigError,
  BuildBotPolicyError,
} from "@/lib/server/build-bot/errors";
import {
  BuildBotFarcasterAlreadyRegisteredError,
  BuildBotFarcasterUserOperationError,
  signupBuildBotFarcaster,
} from "@/lib/server/build-bot/farcaster-signup";
import { normalizeAddress } from "@/lib/shared/address";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

class RequestValidationError extends Error {}

const SignupRequestSchema = z.object({
  signerPublicKey: z
    .string()
    .trim()
    .regex(/^0x[0-9a-fA-F]{64}$/, "signerPublicKey must be 32-byte hex (0x + 64 hex chars)"),
  recoveryAddress: z.string().trim().optional(),
  extraStorage: z.union([z.string().trim(), z.number().int().nonnegative()]).optional(),
});

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
} as const;

function jsonError(status: number, error: string, details?: unknown) {
  return NextResponse.json(
    details
      ? {
          ok: false,
          error,
          details,
        }
      : { ok: false, error },
    { status, headers: NO_STORE_HEADERS }
  );
}

function parseExtraStorage(value: string | number | undefined): bigint {
  if (value === undefined) return 0n;
  if (typeof value === "number") return BigInt(value);

  if (!/^\d+$/.test(value)) {
    throw new RequestValidationError("extraStorage must be a non-negative integer");
  }

  return BigInt(value);
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

  if (error instanceof BuildBotFarcasterAlreadyRegisteredError) {
    return jsonError(409, error.message, {
      fid: error.fid,
      custodyAddress: error.custodyAddress,
    });
  }

  if (error instanceof BuildBotFarcasterUserOperationError) {
    return jsonError(500, error.message);
  }

  if (error instanceof RequestValidationError) {
    return jsonError(400, error.message);
  }

  if (error instanceof z.ZodError) {
    return jsonError(400, "Invalid request body", z.flattenError(error));
  }

  console.error("[build-bot][farcaster][signup] unexpected error", error);
  return jsonError(500, "Internal error");
}

export async function POST(request: Request) {
  try {
    const auth = await requireBuildBotBearerAuth(request);
    const input = SignupRequestSchema.parse(await parseJsonOrEmpty(request));

    const recoveryAddress =
      input.recoveryAddress && input.recoveryAddress.length > 0 ? input.recoveryAddress : undefined;
    if (recoveryAddress && !isAddress(recoveryAddress, { strict: false })) {
      throw new RequestValidationError("Invalid recovery address");
    }

    const result = await signupBuildBotFarcaster({
      ownerAddress: auth.ownerAddress,
      agentKey: auth.agentKey,
      signerPublicKey: input.signerPublicKey.toLowerCase() as `0x${string}`,
      recoveryAddress: recoveryAddress
        ? (normalizeAddress(recoveryAddress) as `0x${string}`)
        : undefined,
      extraStorage: parseExtraStorage(input.extraStorage),
    });

    return NextResponse.json({ ok: true, result }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    return toErrorResponse(error);
  }
}
