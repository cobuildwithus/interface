import { NextResponse } from "next/server";
import { z } from "zod";
import { CliAuthError, CliConfigError, CliPolicyError } from "@/lib/server/cli/errors";

export const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
} as const;

export class RequestValidationError extends Error {}

type JsonErrorOptions = {
  details?: unknown;
  extraHeaders?: Record<string, string>;
  noStore?: boolean;
};

function errorResponseBody(error: string, details: unknown | undefined) {
  if (details === undefined) {
    return { ok: false, error };
  }
  return { ok: false, error, details };
}

export function jsonError(status: number, error: string, options: JsonErrorOptions = {}) {
  const headers =
    options.noStore === false
      ? { ...(options.extraHeaders ?? {}) }
      : { ...NO_STORE_HEADERS, ...(options.extraHeaders ?? {}) };

  return NextResponse.json(errorResponseBody(error, options.details), {
    status,
    headers,
  });
}

type CliErrorHandler = (error: unknown) => NextResponse | null;

type CliErrorResponseOptions = {
  tag: string;
  extraHandlers?: CliErrorHandler[];
  noStore?: boolean;
};

export function cliErrorResponse(
  error: unknown,
  { tag, extraHandlers = [], noStore = true }: CliErrorResponseOptions
) {
  for (const handleError of extraHandlers) {
    const response = handleError(error);
    if (response) return response;
  }

  if (error instanceof CliAuthError) {
    return jsonError(error.status, error.message, { noStore });
  }

  if (error instanceof CliConfigError) {
    return jsonError(503, error.message, { noStore });
  }

  if (error instanceof CliPolicyError) {
    return jsonError(403, error.message, { noStore });
  }

  if (error instanceof RequestValidationError) {
    return jsonError(400, error.message, { noStore });
  }

  if (error instanceof z.ZodError) {
    return jsonError(400, "Invalid request body", {
      details: error.flatten(),
      noStore,
    });
  }

  console.error(`[cli][${tag}] unexpected error`, error);
  return jsonError(500, "Internal error", { noStore });
}

export async function parseJsonOrEmpty(request: Request): Promise<unknown> {
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

export async function parseJsonStrict(request: Request): Promise<unknown> {
  const rawBody = await request.text();
  if (!rawBody.trim()) {
    throw new RequestValidationError("Invalid JSON body");
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    throw new RequestValidationError("Invalid JSON body");
  }
}
