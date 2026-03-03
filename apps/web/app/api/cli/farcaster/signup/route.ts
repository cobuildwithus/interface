import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { z } from "zod";
import { requireCliBearerAuth } from "@/lib/server/cli/auth";
import {
  CliFarcasterAlreadyRegisteredError,
  CliFarcasterUserOperationError,
  signupCliFarcaster,
} from "@/lib/server/cli/farcaster-signup";
import {
  NO_STORE_HEADERS,
  RequestValidationError,
  cliErrorResponse,
  jsonError,
  parseJsonOrEmpty,
} from "@/lib/server/cli/http";
import { normalizeAddress } from "@/lib/shared/address";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SignupRequestSchema = z.object({
  signerPublicKey: z
    .string()
    .trim()
    .regex(/^0x[0-9a-fA-F]{64}$/, "signerPublicKey must be 32-byte hex (0x + 64 hex chars)"),
  recoveryAddress: z.string().trim().optional(),
  extraStorage: z
    .union([z.string().trim(), z.number().int().nonnegative()])
    .optional()
    .refine(
      (value) => {
        if (value === undefined) return true;
        if (typeof value === "number") {
          return value <= 10;
        }
        return /^\d+$/.test(value) ? BigInt(value) <= 10n : true;
      },
      { message: "extraStorage max is 10" }
    ),
});

function parseExtraStorage(value: string | number | undefined): bigint {
  if (value === undefined) return 0n;
  if (typeof value === "number") {
    if (value > 10) {
      throw new RequestValidationError("extraStorage max is 10");
    }
    return BigInt(value);
  }

  if (!/^\d+$/.test(value)) {
    throw new RequestValidationError("extraStorage must be a non-negative integer");
  }

  const parsed = BigInt(value);
  if (parsed > 10n) {
    throw new RequestValidationError("extraStorage max is 10");
  }

  return parsed;
}

function signupErrorResponse(error: unknown) {
  if (error instanceof CliFarcasterAlreadyRegisteredError) {
    return jsonError(409, error.message, {
      details: {
        fid: error.fid,
        custodyAddress: error.custodyAddress,
      },
    });
  }

  if (error instanceof CliFarcasterUserOperationError) {
    return jsonError(500, error.message);
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const auth = await requireCliBearerAuth(request, {
      requiredScopes: ["wallet:execute"],
    });
    const input = SignupRequestSchema.parse(await parseJsonOrEmpty(request));

    const recoveryAddress =
      input.recoveryAddress && input.recoveryAddress.length > 0 ? input.recoveryAddress : undefined;
    if (recoveryAddress && !isAddress(recoveryAddress, { strict: false })) {
      throw new RequestValidationError("Invalid recovery address");
    }

    const result = await signupCliFarcaster({
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
    return cliErrorResponse(error, {
      tag: "farcaster][signup",
      extraHandlers: [signupErrorResponse],
    });
  }
}
