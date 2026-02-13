import { getAddress, type Address } from "viem";

/**
 * Canonical wallet normalization for DB/cache keys:
 * - validate/checksum with viem
 * - store as lowercase
 */
export function normalizeAddress(address: string): Address {
  return getAddress(address).toLowerCase() as Address;
}
