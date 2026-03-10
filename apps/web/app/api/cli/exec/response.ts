import { NextResponse } from "next/server";
import { getCliExplorerTxUrl } from "@/lib/server/cli/explorer";
import { NO_STORE_HEADERS, jsonError } from "@/lib/server/cli/http";

export class IdempotencyConflictError extends Error {}

export class UserOperationFailedError extends Error {}

export function execErrorResponse(error: unknown) {
  if (error instanceof IdempotencyConflictError) {
    return jsonError(409, error.message);
  }

  if (error instanceof UserOperationFailedError) {
    return jsonError(500, error.message);
  }
  return null;
}

export function buildSuccessResponse(params: {
  kind: "transfer" | "tx" | "protocol-step";
  walletAddress: string;
  network: string;
  transactionHash: string | null;
  replayed?: boolean;
  userOpHash?: string;
}) {
  return NextResponse.json(
    {
      ok: true,
      kind: params.kind,
      status: "confirmed",
      ...(params.replayed ? { replayed: true } : {}),
      wallet: {
        address: params.walletAddress,
      },
      transactionHash: params.transactionHash,
      ...(params.userOpHash ? { userOpHash: params.userOpHash } : {}),
      explorerUrl: getCliExplorerTxUrl(params.network, params.transactionHash),
    },
    { headers: NO_STORE_HEADERS }
  );
}

export function buildPendingResponse(params: {
  kind: "transfer" | "tx" | "protocol-step";
  walletAddress: string;
  network: string;
  userOpHash: string;
  replayed?: boolean;
}) {
  return NextResponse.json(
    {
      ok: true,
      kind: params.kind,
      status: "pending",
      pending: true,
      ...(params.replayed ? { replayed: true } : {}),
      wallet: {
        address: params.walletAddress,
      },
      transactionHash: null,
      userOpHash: params.userOpHash,
      explorerUrl: null,
    },
    {
      status: 202,
      headers: NO_STORE_HEADERS,
    }
  );
}
