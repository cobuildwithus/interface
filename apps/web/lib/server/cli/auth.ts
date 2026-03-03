import "server-only";

import * as jose from "jose";
import {
  DEFAULT_BUILD_BOT_JWT_AUDIENCE,
  DEFAULT_BUILD_BOT_JWT_ISSUER,
  DEFAULT_DEV_BUILD_BOT_JWT_PUBLIC_KEY,
  deriveCliScopeCapabilities,
  parseBearerToken,
  parseCliJwtVerifiedClaims,
  splitScope,
} from "@cobuild/wire";
import { getSession } from "@/lib/domains/auth/session";
import { normalizeAddress } from "@/lib/shared/address";
import { CliAuthError } from "./errors";

type CliBearerAuth = {
  ownerAddress: `0x${string}`;
  sessionId: string;
  agentKey: string;
  scope: string;
  scopes: string[];
  hasToolsWrite: boolean;
  hasWalletExecute: boolean;
  hasAnyWriteScope: boolean;
};

type RequireCliBearerAuthOptions = {
  requireWalletExecute?: boolean;
  requiredScopes?: string[];
};

let cachedPublicKey: CryptoKey | undefined;
let cachedPublicKeySource: string | undefined;

function getBuildBotJwtPublicKey(): string {
  const configured = process.env.BUILD_BOT_JWT_PUBLIC_KEY?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error("Missing BUILD_BOT_JWT_PUBLIC_KEY");
  }
  return DEFAULT_DEV_BUILD_BOT_JWT_PUBLIC_KEY;
}

function getBuildBotJwtIssuer(): string {
  return process.env.BUILD_BOT_JWT_ISSUER?.trim() || DEFAULT_BUILD_BOT_JWT_ISSUER;
}

function getBuildBotJwtAudience(): string {
  return process.env.BUILD_BOT_JWT_AUDIENCE?.trim() || DEFAULT_BUILD_BOT_JWT_AUDIENCE;
}

async function getCliJwtPublicKey(): Promise<CryptoKey> {
  const source = getBuildBotJwtPublicKey().replace(/\\n/g, "\n").trim();
  if (!cachedPublicKey || cachedPublicKeySource !== source) {
    cachedPublicKey = await jose.importSPKI(source, "ES256");
    cachedPublicKeySource = source;
  }
  return cachedPublicKey;
}

export async function requireCliSessionAddress(): Promise<`0x${string}`> {
  const session = await getSession();
  if (!session.address) {
    throw new CliAuthError(401, "Unauthorized");
  }

  return normalizeAddress(session.address);
}

async function verifyCliAccessToken(rawToken: string): Promise<CliBearerAuth | null> {
  const publicKey = await getCliJwtPublicKey();
  const issuer = getBuildBotJwtIssuer();
  const audience = getBuildBotJwtAudience();

  let payload: jose.JWTPayload;
  try {
    const verified = await jose.jwtVerify(rawToken, publicKey, {
      algorithms: ["ES256"],
      issuer,
      audience,
    });
    payload = verified.payload;
  } catch {
    return null;
  }

  const claims = parseCliJwtVerifiedClaims(payload);
  if (!claims) {
    return null;
  }

  const ownerAddress = normalizeAddress(claims.sub);
  const scope = claims.scope.trim();
  if (!ownerAddress || !scope) {
    return null;
  }

  const agentKey = claims.agentKey.trim();
  const sessionId = claims.sid.trim();
  if (!agentKey || !sessionId) {
    return null;
  }

  const scopes = splitScope(scope);
  if (scopes.length === 0) {
    return null;
  }

  return {
    ownerAddress,
    sessionId,
    agentKey,
    scope,
    scopes,
    ...deriveCliScopeCapabilities(scope),
  };
}

export async function requireCliBearerAuth(
  req: Request,
  options?: RequireCliBearerAuthOptions
): Promise<CliBearerAuth> {
  const rawToken = parseBearerToken(req.headers.get("authorization"));
  if (!rawToken) {
    throw new CliAuthError(401, "Unauthorized");
  }

  const auth = await verifyCliAccessToken(rawToken);
  if (!auth) {
    throw new CliAuthError(401, "Unauthorized");
  }

  const requiredScopes = [...(options?.requiredScopes ?? [])];
  if (options?.requireWalletExecute) {
    requiredScopes.push("wallet:execute");
  }

  for (const requiredScope of requiredScopes) {
    if (!auth.scopes.includes(requiredScope)) {
      throw new CliAuthError(403, `${requiredScope} scope required`);
    }
  }

  return auth;
}
