import { parseEther, parseUnits } from "viem";
import { z } from "zod";
import { RequestValidationError } from "@/lib/server/cli/http";
import { IdempotencyKeySchema } from "@/lib/server/cli/idempotency";

export const CLI_EXEC_NETWORKS = ["base", "base-sepolia"] as const;

const ExecRequestBaseSchema = z.object({
  network: z.string().trim().min(1).max(64).optional(),
  idempotencyKey: IdempotencyKeySchema.optional(),
  agentKey: z.string().trim().min(1).max(64).optional(),
});

export const ExecRequestSchema = z.discriminatedUnion("kind", [
  ExecRequestBaseSchema.extend({
    kind: z.literal("transfer"),
    to: z.string().trim().min(1),
    token: z.string().trim().min(1),
    amount: z.string().trim().min(1),
    decimals: z.number().int().min(0).max(255).optional(),
  }),
  ExecRequestBaseSchema.extend({
    kind: z.literal("tx"),
    to: z.string().trim().min(1),
    valueEth: z.string().trim().default("0"),
    data: z.string().regex(/^0x([0-9a-fA-F]{2})*$/),
  }),
]);

const TransferNetworkSchema = z.enum(CLI_EXEC_NETWORKS);
const TxNetworkSchema = z.enum(CLI_EXEC_NETWORKS);

export function parseEtherInput(value: string, fieldName: string): bigint {
  try {
    return parseEther(value);
  } catch {
    throw new RequestValidationError(`${fieldName} must be a valid decimal amount`);
  }
}

export function parseUnitsInput(value: string, decimals: number, fieldName: string): bigint {
  try {
    return parseUnits(value, decimals);
  } catch {
    throw new RequestValidationError(`${fieldName} must be a valid decimal amount`);
  }
}

function parseNetwork<TNetwork extends string>(
  network: string,
  schema: z.ZodType<TNetwork>,
  kind: "transfer" | "transaction"
): TNetwork {
  const parsed = schema.safeParse(network);
  if (!parsed.success) {
    throw new RequestValidationError(`Unsupported ${kind} network: ${network}`);
  }

  return parsed.data;
}

export function parseTransferNetwork(network: string): (typeof CLI_EXEC_NETWORKS)[number] {
  return parseNetwork(network, TransferNetworkSchema, "transfer");
}

export function parseTxNetwork(network: string): (typeof CLI_EXEC_NETWORKS)[number] {
  return parseNetwork(network, TxNetworkSchema, "transaction");
}

export function assertAgentScopeMatch(
  requestAgentKey: string | undefined,
  authAgentKey: string
): void {
  if (requestAgentKey && requestAgentKey !== authAgentKey) {
    throw new RequestValidationError("agentKey does not match token scope");
  }
}
