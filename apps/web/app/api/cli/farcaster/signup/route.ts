import { NextResponse } from "next/server";
import {
  buildFarcasterSignupAlreadyRegisteredErrorResponse,
  buildFarcasterSignupResponse,
  normalizeFarcasterExtraStorage,
  normalizeEvmAddress as normalizeAddress,
} from "@cobuild/wire";
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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SignupRequestSchema = z.object({
  signerPublicKey: z
    .string()
    .trim()
    .regex(/^0x[0-9a-fA-F]{64}$/, "signerPublicKey must be 32-byte hex (0x + 64 hex chars)"),
  recoveryAddress: z.string().trim().optional(),
  extraStorage: z.union([z.string().trim(), z.number()]).optional(),
});

function parseExtraStorage(value: string | number | undefined): bigint {
  try {
    return normalizeFarcasterExtraStorage(value, "extraStorage");
  } catch (error) {
    if (error instanceof Error) {
      throw new RequestValidationError(error.message);
    }
    throw error;
  }
}

function signupErrorResponse(error: unknown) {
  if (error instanceof CliFarcasterAlreadyRegisteredError) {
    const response = buildFarcasterSignupAlreadyRegisteredErrorResponse({
      error: error.message,
      fid: error.fid,
      custodyAddress: error.custodyAddress,
    });
    return NextResponse.json(response, {
      status: 409,
      headers: NO_STORE_HEADERS,
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
        ? (normalizeAddress(recoveryAddress, "recoveryAddress") as `0x${string}`)
        : undefined,
      extraStorage: parseExtraStorage(input.extraStorage),
    });

    return NextResponse.json(buildFarcasterSignupResponse(result), { headers: NO_STORE_HEADERS });
  } catch (error) {
    return cliErrorResponse(error, {
      tag: "farcaster][signup",
      extraHandlers: [signupErrorResponse],
    });
  }
}
