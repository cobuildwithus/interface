import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBuildBotBearerAuth } from "@/lib/server/build-bot/auth";
import { getOrCreateBuildBotAgentWallet } from "@/lib/server/build-bot/wallet-store";
import {
  BuildBotAuthError,
  BuildBotConfigError,
  BuildBotPolicyError,
} from "@/lib/server/build-bot/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

class RequestValidationError extends Error {}

const WalletRequestSchema = z.object({
  defaultNetwork: z.string().trim().min(1).max(64).optional(),
});

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
} as const;

const MISSING_BUILD_BOT_TABLES_ERROR =
  "Build Bot database tables are missing. Run the build-bot SQL migrations before running setup.";
const BUILD_BOT_REQUIRED_TABLES = ["build_bot_cli_tokens", "build_bot_agent_wallets"] as const;

type PrismaMissingTableError = {
  code?: unknown;
  meta?: {
    table?: unknown;
  } | null;
};

function isMissingBuildBotTablesError(error: unknown): boolean {
  const prismaError = error as PrismaMissingTableError | null;
  const missingTable = prismaError?.meta?.table;
  if (prismaError?.code !== "P2021" || typeof missingTable !== "string") {
    return false;
  }
  return BUILD_BOT_REQUIRED_TABLES.some((tableName) => missingTable.includes(tableName));
}

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

  if (isMissingBuildBotTablesError(error)) {
    return jsonError(500, MISSING_BUILD_BOT_TABLES_ERROR);
  }

  if (error instanceof RequestValidationError) {
    return jsonError(400, error.message);
  }

  if (error instanceof z.ZodError) {
    return jsonError(400, "Invalid request body", z.flattenError(error));
  }

  console.error("[build-bot][wallet] unexpected error", error);
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
    const input = WalletRequestSchema.parse(await parseJsonOrEmpty(request));

    const wallet = await getOrCreateBuildBotAgentWallet({
      ownerAddress: auth.ownerAddress,
      agentKey: auth.agentKey,
      defaultNetwork: input.defaultNetwork,
    });

    return NextResponse.json(
      {
        ok: true,
        wallet: {
          ownerAddress: wallet.ownerAddress,
          agentKey: wallet.agentKey,
          address: wallet.address,
          defaultNetwork: wallet.defaultNetwork,
        },
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
