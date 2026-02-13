let cachedAdmins: Set<string> | null = null;
let cachedRawAdmins = "";

function getGlobalAdmins(): Set<string> {
  const rawAdmins = process.env.GLOBAL_ADMINS ?? "";

  if (cachedAdmins && cachedRawAdmins === rawAdmins) {
    return cachedAdmins;
  }

  cachedRawAdmins = rawAdmins;
  cachedAdmins = new Set(
    rawAdmins
      .split(",")
      .map((addr) => addr.trim())
      .filter(Boolean)
      .map((addr) => addr.toLowerCase())
  );

  return cachedAdmins;
}

export function isGlobalAdmin(address: string | undefined | null): boolean {
  if (!address) return false;
  return getGlobalAdmins().has(address.toLowerCase());
}

export function isAdminFor(address: string | undefined | null, roundAdmins: string[]): boolean {
  if (!address) return false;
  const normalized = address.toLowerCase();
  return (
    getGlobalAdmins().has(normalized) || roundAdmins.some((a) => a.toLowerCase() === normalized)
  );
}
