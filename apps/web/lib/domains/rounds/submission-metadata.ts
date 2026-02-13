import type { Prisma } from "@/generated/prisma/client";
import type { JsonValue } from "@/lib/shared/json";

type AnyJsonValue = JsonValue | Prisma.JsonValue;
type JsonRecordLike = Record<string, AnyJsonValue | undefined>;

function isRecord(value: AnyJsonValue | null | undefined): value is JsonRecordLike {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getBeneficiaryAddressFromMetadata(
  metadata: AnyJsonValue | null | undefined
): `0x${string}` | null {
  if (!isRecord(metadata)) return null;
  const value = metadata.beneficiaryAddress;
  return typeof value === "string" && value.startsWith("0x") ? (value as `0x${string}`) : null;
}
