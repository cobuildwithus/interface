import { usdc } from "@/lib/domains/token/usdc";

export function parseUsdcAmount(input: string): bigint | null {
  if (!input) return null;
  try {
    const value = usdc.parse(input);
    return value > 0n ? value : null;
  } catch {
    return null;
  }
}
