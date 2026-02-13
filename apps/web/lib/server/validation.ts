import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { JsonRecord, JsonValue } from "@/lib/shared/json";

type AnyJsonValue = JsonValue | Prisma.JsonValue;

export function isRecord(value: AnyJsonValue | null | undefined): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
