import { BaseError } from "viem";
import { normalizeFarcasterUsername } from "@/lib/integrations/farcaster/fname";

export const sanitizeUsername = (value: string) =>
  normalizeFarcasterUsername(value).replace(/[^a-z0-9-]/g, "");

export function formatSignupError(error: unknown): string {
  if (error instanceof BaseError && error.shortMessage) {
    return error.shortMessage;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Something went wrong while creating your account.";
}

export async function readErrorResponse(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const parsed = JSON.parse(text) as { error?: string };
    if (parsed?.error) return parsed.error;
  } catch {
    // Ignore parse error, fallback to raw text.
  }
  return text || `Request failed (${res.status}).`;
}
