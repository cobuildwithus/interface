import "server-only";

import * as jose from "jose";
import { getSession } from "@/lib/domains/auth/session";
import { normalizeAddress } from "@/lib/shared/address";
import { parseBearerToken } from "@/lib/shared/parse-bearer-token";
import { CliAuthError } from "./errors";

const DEFAULT_BUILD_BOT_JWT_PUBLIC_KEY = [
  "-----BEGIN PUBLIC KEY-----",
  "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEJez1f0LBeC5VJfNUE7v3bEwk79JO",
  "itJMKsbBgPEGjEsgKKnjHceciarnRNwVlwSj7Xx7j8gIUKdB+grhzp5jNQ==",
  "-----END PUBLIC KEY-----",
].join("\n");

const DEFAULT_BUILD_BOT_JWT_ISSUER = "cobuild-chat-api";
const DEFAULT_BUILD_BOT_JWT_AUDIENCE = "buildbot";

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

type CliAccessTokenClaims = {
  sub: string;
  sid: string;
  agentKey: string;
  scope: string;
};

let cachedPublicKey: CryptoKey | undefined;
let cachedPublicKeySource: string | undefined;

function getBuildBotJwtPublicKey(): string {
  const configured = process.env.BUILD_BOT_JWT_PUBLIC_KEY?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error("Missing BUILD_BOT_JWT_PUBLIC_KEY");
  }
  return DEFAULT_BUILD_BOT_JWT_PUBLIC_KEY;
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

function parseCliAccessTokenClaims(payload: jose.JWTPayload): CliAccessTokenClaims | null {
  if (
    typeof payload.sub !== "string" ||
    typeof payload.sid !== "string" ||
    typeof payload.agent_key !== "string" ||
    typeof payload.scope !== "string"
  ) {
    return null;
  }

  return {
    sub: payload.sub,
    sid: payload.sid,
    agentKey: payload.agent_key,
    scope: payload.scope,
  };
}

function splitScope(scope: string): string[] {
  return scope
    .split(/\s+/)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function hasScope(scopes: string[], requiredScope: string): boolean {
  return scopes.includes(requiredScope);
}

function deriveWriteCapabilities(scopes: string[]): {
  hasToolsWrite: boolean;
  hasWalletExecute: boolean;
  hasAnyWriteScope: boolean;
} {
  const hasToolsWrite = scopes.includes("tools:write");
  const hasWalletExecute = scopes.includes("wallet:execute");
  return {
    hasToolsWrite,
    hasWalletExecute,
    hasAnyWriteScope: hasToolsWrite || hasWalletExecute,
  };
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

  const claims = parseCliAccessTokenClaims(payload);
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
    ...deriveWriteCapabilities(scopes),
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
    if (!hasScope(auth.scopes, requiredScope)) {
      throw new CliAuthError(403, `${requiredScope} scope required`);
    }
  }

  return auth;
}
