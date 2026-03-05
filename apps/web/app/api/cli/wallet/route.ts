import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCliBearerAuth } from "@/lib/server/cli/auth";
import {
  NO_STORE_HEADERS,
  RequestValidationError,
  cliErrorResponse,
  jsonError,
  parseJsonOrEmpty,
} from "@/lib/server/cli/http";
import { getOrCreateCliAgentWallet } from "@/lib/server/cli/wallet-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WalletRequestSchema = z.object({
  defaultNetwork: z.string().trim().min(1).max(64).optional(),
  agentKey: z.string().trim().min(1).max(64).optional(),
});

const MISSING_CLI_TABLES_ERROR =
  "CLI database tables are missing. Run the cli SQL migrations before running setup.";
const CLI_REQUIRED_TABLES = ["cli_agent_wallets"] as const;

type PrismaMissingTableError = {
  code?: unknown;
  meta?: {
    table?: unknown;
  } | null;
};

function isMissingCliTablesError(error: unknown): boolean {
  const prismaError = error as PrismaMissingTableError | null;
  const missingTable = prismaError?.meta?.table;
  if (prismaError?.code !== "P2021" || typeof missingTable !== "string") {
    return false;
  }
  return CLI_REQUIRED_TABLES.some((tableName) => missingTable.includes(tableName));
}

function missingCliTablesErrorResponse(error: unknown) {
  if (isMissingCliTablesError(error)) {
    return jsonError(500, MISSING_CLI_TABLES_ERROR);
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const auth = await requireCliBearerAuth(request, {
      requiredScopes: ["wallet:execute"],
    });
    const input = WalletRequestSchema.parse(await parseJsonOrEmpty(request));
    if (input.agentKey && input.agentKey !== auth.agentKey) {
      throw new RequestValidationError("agentKey does not match token scope");
    }

    const wallet = await getOrCreateCliAgentWallet({
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
    return cliErrorResponse(error, {
      tag: "wallet",
      extraHandlers: [missingCliTablesErrorResponse],
    });
  }
}
