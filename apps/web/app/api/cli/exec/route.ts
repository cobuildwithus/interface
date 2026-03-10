import { requireCliBearerAuth } from "@/lib/server/cli/auth";
import { cliErrorResponse, parseJsonStrict } from "@/lib/server/cli/http";
import { resolveIdempotencyKey } from "@/lib/server/cli/idempotency";
import { cliExecPrimaryDb } from "./idempotency";
import { handleProtocolStepExecution } from "./protocol-step";
import { execErrorResponse } from "./response";
import { handleTransferExecution } from "./transfer";
import { handleTxExecution } from "./tx";
import { assertAgentScopeMatch, ExecRequestSchema } from "./validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CLI_EXEC_MAX_BODY_BYTES = 64 * 1024;

export async function POST(request: Request) {
  try {
    const auth = await requireCliBearerAuth(request, {
      requiredScopes: ["wallet:execute"],
    });
    const input = ExecRequestSchema.parse(
      await parseJsonStrict(request, {
        maxBytes: CLI_EXEC_MAX_BODY_BYTES,
      })
    );
    assertAgentScopeMatch(input.agentKey, auth.agentKey);
    const idempotencyKey = resolveIdempotencyKey(request, input.idempotencyKey);
    const db = cliExecPrimaryDb();

    if (input.kind === "transfer") {
      return await handleTransferExecution({
        db,
        auth: {
          ownerAddress: auth.ownerAddress,
          agentKey: auth.agentKey,
        },
        input,
        idempotencyKey,
      });
    }

    if (input.kind === "protocol-step") {
      return await handleProtocolStepExecution({
        db,
        auth: {
          ownerAddress: auth.ownerAddress,
          agentKey: auth.agentKey,
        },
        input,
        idempotencyKey,
      });
    }

    return await handleTxExecution({
      db,
      auth: {
        ownerAddress: auth.ownerAddress,
        agentKey: auth.agentKey,
      },
      input,
      idempotencyKey,
    });
  } catch (error) {
    return cliErrorResponse(error, {
      tag: "exec",
      extraHandlers: [execErrorResponse],
    });
  }
}
