import { z } from "zod";
import { RequestValidationError } from "@/lib/server/cli/http";

export const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const IdempotencyKeyValueSchema = z
  .string()
  .trim()
  .regex(UUID_V4_REGEX, "idempotencyKey must be a UUID v4");

export const IdempotencyKeySchema = IdempotencyKeyValueSchema.optional();

export function parseIdempotencyKeyHeader(request: Request): string | null {
  const headerValue =
    request.headers.get("x-idempotency-key")?.trim() ??
    request.headers.get("idempotency-key")?.trim();
  if (!headerValue) return null;

  const parsedHeader = IdempotencyKeyValueSchema.safeParse(headerValue);
  if (!parsedHeader.success) {
    throw new RequestValidationError("Idempotency-Key header must be a UUID v4");
  }

  return parsedHeader.data;
}

export function resolveIdempotencyKey(
  request: Request,
  bodyIdempotencyKey?: string
): string | null {
  const headerKey = parseIdempotencyKeyHeader(request);
  const bodyKey = bodyIdempotencyKey?.trim() || null;

  if (headerKey && bodyKey && headerKey !== bodyKey) {
    throw new RequestValidationError(
      "Idempotency-Key header and body idempotencyKey must match when both are provided"
    );
  }

  return headerKey ?? bodyKey;
}
