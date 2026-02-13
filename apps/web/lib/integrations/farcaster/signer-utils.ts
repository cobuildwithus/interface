export type NeynarSignerPermissions = string[];

const UUID_REGEX = /^[a-f0-9-]{36}$/i;
const PERMISSION_SEPARATOR = /[\s-]+/g;

function normalizePermissionToken(value: string): string {
  return value.trim().toLowerCase().replace(PERMISSION_SEPARATOR, "_");
}

export function normalizeFid(input: string | number | null | undefined): number | null {
  const fid =
    typeof input === "string"
      ? Number.parseInt(input, 10)
      : typeof input === "number"
        ? input
        : null;

  if (fid === null || !Number.isFinite(fid) || fid <= 0 || !Number.isSafeInteger(fid)) {
    return null;
  }

  return fid;
}

export function isValidSignerUuid(value: string | null | undefined): value is string {
  return typeof value === "string" && UUID_REGEX.test(value);
}

export function normalizeSignerPermissions(
  input: string[] | null | undefined
): NeynarSignerPermissions | null {
  if (!Array.isArray(input)) return null;
  const permissions = input
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map(normalizePermissionToken);
  if (permissions.length === 0) return null;
  return Array.from(new Set(permissions));
}

export function hasCastPermission(permissions: string[] | null): boolean {
  if (!permissions || permissions.length === 0) return false;
  return permissions.some((permission) => {
    const normalized = normalizePermissionToken(permission);
    if (normalized === "cast") return true;
    if (normalized === "write_all" || normalized === "write" || normalized === "write_public") {
      return true;
    }
    if (normalized === "publish_cast") return true;
    return (
      normalized.includes("write") &&
      (normalized.includes("all") || normalized.includes("cast") || normalized.includes("post"))
    );
  });
}
