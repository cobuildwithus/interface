import type { JsonRecord, JsonValue } from "@/lib/shared/json";

export function isRecord(value: JsonValue): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function unwrapData(json: JsonValue): JsonRecord | null {
  if (!isRecord(json)) return null;
  const root = json;
  const wrapped = root.data;
  if (isRecord(wrapped)) {
    return wrapped;
  }
  return root;
}

export function readNonEmptyString(value: JsonValue): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function readRulePassedValue(obj: JsonRecord): boolean | null | undefined {
  const value = "rulePassed" in obj ? obj.rulePassed : "passed" in obj ? obj.passed : undefined;
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") return null;
  return value;
}

export function coerceRuleId(value: JsonValue, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && Number.isFinite(Number(value))) return Number(value);
  return fallback;
}
