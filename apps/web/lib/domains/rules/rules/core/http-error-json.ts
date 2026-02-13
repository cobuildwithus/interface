import type { JsonRecord, JsonValue } from "@/lib/shared/json";

type HttpError = Error & { status?: number };

const isRecord = (value: JsonValue): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function readString(obj: JsonRecord, keys: string[]): string | null {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length > 0) return trimmed;
    }
  }
  return null;
}

function extractErrorMessageFromJson(parsed: JsonValue): string | null {
  if (!isRecord(parsed)) return null;
  const obj = parsed;

  const direct =
    readString(obj, ["outcomeReason", "outcome_reason", "reason", "message", "detail"]) ??
    readString(obj, ["error_description"]);
  if (direct) return direct;

  const errorField = readString(obj, ["error"]);
  if (errorField) return errorField;

  const errors = obj.errors;
  if (typeof errors === "string") {
    const trimmed = errors.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (Array.isArray(errors) && errors.length > 0) {
    for (const item of errors) {
      if (typeof item === "string") {
        const trimmed = item.trim();
        if (trimmed.length > 0) return trimmed;
        continue;
      }
      if (isRecord(item)) {
        const inner = extractErrorMessageFromJson(item);
        if (inner) return inner;
      }
    }
  } else if (isRecord(errors)) {
    const inner = extractErrorMessageFromJson(errors);
    if (inner) return inner;
  }

  const data = obj.data;
  if (isRecord(data)) {
    const inner = extractErrorMessageFromJson(data);
    if (inner) return inner;
  }

  return null;
}

export function parseHttpErrorJsonObject(error: HttpError): JsonRecord | null {
  const status = error.status;
  if (!status || status < 400 || status >= 500) return null;

  const message = error.message;
  if (!message) return null;

  const match = message.match(/^HTTP\s+\d+:\s+(.+)$/s);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[1]) as JsonValue;
    if (!isRecord(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function formatRulesCheckError(
  error: HttpError,
  options: { defaultMessage: string }
): string {
  if (error.status === 429) {
    return "Verification is still running. Try again in a few seconds.";
  }

  const message = error.message || options.defaultMessage;
  if (message.toLowerCase().includes("request timed out")) {
    return "Verification is taking longer than expected. Try again shortly.";
  }

  const httpMatch = message.match(/^HTTP\s+(\d+):\s*(.+)/s);
  if (!httpMatch) return message;

  try {
    const parsed = JSON.parse(httpMatch[2]);
    const extracted = extractErrorMessageFromJson(parsed);
    if (extracted) return extracted;
  } catch {
    // ignore
  }

  return "Something went wrong. Please try again.";
}
