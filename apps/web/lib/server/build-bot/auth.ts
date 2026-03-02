import "server-only";

import { getSession } from "@/lib/domains/auth/session";
import { normalizeAddress } from "@/lib/shared/address";
import { BuildBotAuthError } from "./errors";
import { authenticateBuildBotCliToken } from "./token-store";

function parseBearerToken(value: string | null): string | null {
  if (!value) return null;
  const match = value.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  return match[1]?.trim() || null;
}

type BuildBotBearerAuth = {
  ownerAddress: `0x${string}`;
  tokenId: string;
  agentKey: string;
  canWrite: boolean;
};

type RequireBuildBotBearerAuthOptions = {
  requireWrite?: boolean;
};

export async function requireBuildBotSessionAddress(): Promise<`0x${string}`> {
  const session = await getSession();
  if (!session.address) {
    throw new BuildBotAuthError(401, "Unauthorized");
  }

  return normalizeAddress(session.address);
}

export async function requireBuildBotBearerAuth(
  req: Request,
  options?: RequireBuildBotBearerAuthOptions
): Promise<BuildBotBearerAuth> {
  const rawToken = parseBearerToken(req.headers.get("authorization"));
  if (!rawToken) {
    throw new BuildBotAuthError(401, "Unauthorized");
  }

  const auth = await authenticateBuildBotCliToken(rawToken);
  if (!auth) {
    throw new BuildBotAuthError(401, "Unauthorized");
  }

  if (options?.requireWrite && !auth.canWrite) {
    throw new BuildBotAuthError(403, "Write scope required");
  }

  return auth;
}
