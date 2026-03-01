import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBuildBotSessionAddress } from "@/lib/server/build-bot/auth";
import {
  createBuildBotCliToken,
  listBuildBotCliTokens,
  revokeBuildBotCliToken,
} from "@/lib/server/build-bot/token-store";
import { BuildBotAuthError } from "@/lib/server/build-bot/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

class RequestValidationError extends Error {}

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
});

const RevokeTokenSchema = z.object({
  tokenId: z.string().trim().min(1),
});

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
} as const;

const MISSING_BUILD_BOT_TABLES_ERROR =
  "Build Bot database tables are missing. Run the build-bot SQL migrations before running setup.";

type PrismaMissingTableError = {
  code?: unknown;
  meta?: {
    table?: unknown;
  } | null;
};

function isMissingBuildBotTableError(error: unknown): boolean {
  const prismaError = error as PrismaMissingTableError | null;
  return (
    prismaError?.code === "P2021" &&
    typeof prismaError.meta?.table === "string" &&
    prismaError.meta.table.includes("build_bot_cli_tokens")
  );
}

function jsonNoStore(body: unknown) {
  return NextResponse.json(body, { headers: NO_STORE_HEADERS });
}

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

  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid request body",
        details: z.flattenError(error),
      },
      { status: 400 }
    );
  }

  if (isMissingBuildBotTableError(error)) {
    return NextResponse.json({ ok: false, error: MISSING_BUILD_BOT_TABLES_ERROR }, { status: 500 });
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

export async function GET() {
  try {
    const ownerAddress = await requireBuildBotSessionAddress();
    const tokens = await listBuildBotCliTokens(ownerAddress);

    return jsonNoStore({
      ok: true,
      tokens,
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

    const ownerAddress = await requireBuildBotSessionAddress();
    const input = CreateTokenSchema.parse(await parseJsonOrEmpty(request));
    const created = await createBuildBotCliToken({
      ownerAddress,
      label: input.label,
      agentKey: input.agentKey,
    });

    return jsonNoStore({
      ok: true,
      token: created.token,
      tokenInfo: created.tokenInfo,
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

    const ownerAddress = await requireBuildBotSessionAddress();
    const input = RevokeTokenSchema.parse(await parseJsonOrEmpty(request));
    const revoked = await revokeBuildBotCliToken({
      ownerAddress,
      tokenId: input.tokenId,
    });

    return jsonNoStore({
      ok: true,
      revoked,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
