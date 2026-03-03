import { z } from "zod";
import {
  IDEMPOTENCY_DEPRECATED_HEADER,
  IDEMPOTENCY_KEY_PATTERN,
  IDEMPOTENCY_PRIMARY_HEADER,
  isIdempotencyKey,
} from "@cobuild/wire";
import { RequestValidationError } from "@/lib/server/cli/http";

export const UUID_V4_REGEX = IDEMPOTENCY_KEY_PATTERN;

export const IdempotencyKeyValueSchema = z
  .string()
  .trim()
  .refine(isIdempotencyKey, "idempotencyKey must be a UUID v4");

export const IdempotencyKeySchema = IdempotencyKeyValueSchema.optional();

export function parseIdempotencyKeyHeader(request: Request): string | null {
  const headerValue =
    request.headers.get(IDEMPOTENCY_DEPRECATED_HEADER.toLowerCase())?.trim() ??
    request.headers.get(IDEMPOTENCY_PRIMARY_HEADER.toLowerCase())?.trim();
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
