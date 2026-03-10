import { requireCliBearerAuth } from "@/lib/server/cli/auth";
import { cliErrorResponse, parseJsonStrict } from "@/lib/server/cli/http";
import { resolveIdempotencyKey } from "@/lib/server/cli/idempotency";
import { getOrCreateCliAgentWallet } from "@/lib/server/cli/wallet-store";
import { normalizeEvmAddress as normalizeAddress } from "@cobuild/wire";
import { cliExecPrimaryDb } from "./idempotency";
import { execErrorResponse } from "./response";
import { handleTransferExecution } from "./transfer";
import { handleTxExecution } from "./tx";
import { assertAgentScopeMatch, ExecRequestSchema } from "./validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const auth = await requireCliBearerAuth(request, {
      requiredScopes: ["wallet:execute"],
    });
    const input = ExecRequestSchema.parse(await parseJsonStrict(request));
    assertAgentScopeMatch(input.agentKey, auth.agentKey);
    const idempotencyKey = resolveIdempotencyKey(request, input.idempotencyKey);
    const db = cliExecPrimaryDb();

    const wallet = await getOrCreateCliAgentWallet({
      ownerAddress: auth.ownerAddress,
      agentKey: auth.agentKey,
    });
    const requestedNetwork = input.network ?? wallet.defaultNetwork;
    const walletAddress =
      typeof wallet.address === "string" && wallet.address.length > 0
        ? normalizeAddress(wallet.address, "wallet.address")
        : undefined;

    if (input.kind === "transfer") {
      return await handleTransferExecution({
        db,
        auth: {
          ownerAddress: auth.ownerAddress,
          agentKey: auth.agentKey,
        },
        input,
        requestedNetwork,
        idempotencyKey,
        walletAddress,
      });
    }

    return await handleTxExecution({
      db,
      auth: {
        ownerAddress: auth.ownerAddress,
        agentKey: auth.agentKey,
      },
      input,
      requestedNetwork,
      idempotencyKey,
      walletAddress,
    });
  } catch (error) {
    return cliErrorResponse(error, {
      tag: "exec",
      extraHandlers: [execErrorResponse],
    });
  }
}
