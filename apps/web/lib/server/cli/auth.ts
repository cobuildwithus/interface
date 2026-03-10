import "server-only";

import * as jose from "jose";
import prisma, { prismaPrimary } from "@/lib/server/db/cobuild-db-client";
import {
  DEFAULT_CLI_JWT_AUDIENCE,
  DEFAULT_CLI_JWT_ISSUER,
  DEFAULT_DEV_CLI_JWT_PUBLIC_KEY,
  deriveCliVerifiedPrincipal,
  normalizeEvmAddress as normalizeAddress,
  parseBearerToken,
  parseCliJwtVerifiedClaims,
  type CliVerifiedPrincipal,
} from "@cobuild/wire";
import { getSession } from "@/lib/domains/auth/session";
import { CliAuthError } from "./errors";

type CliBearerAuth = Omit<CliVerifiedPrincipal, "hasToolsRead">;

type RequireCliBearerAuthOptions = {
  requireWalletExecute?: boolean;
  requiredScopes?: string[];
};

let cachedPublicKey: CryptoKey | undefined;
let cachedPublicKeySource: string | undefined;

type ActiveCliSessionRow = {
  id: bigint | number;
};

function allowDevCliKeyFallback(): boolean {
  if (process.env.NODE_ENV === "production") {
    return false;
  }
  if (process.env.VITEST === "true") {
    return true;
  }
  const flag = process.env.CLI_ALLOW_DEV_KEYS?.toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes";
}

function getCliJwtPublicKeyPem(): string {
  const configured = process.env.CLI_JWT_PUBLIC_KEY?.trim();
  if (configured) return configured;
  if (!allowDevCliKeyFallback()) {
    throw new Error(
      "Missing CLI_JWT_PUBLIC_KEY. Configure CLI JWT keys or set CLI_ALLOW_DEV_KEYS=1 for local development only."
    );
  }
  return DEFAULT_DEV_CLI_JWT_PUBLIC_KEY;
}

function getCliJwtIssuer(): string {
  return process.env.CLI_JWT_ISSUER?.trim() || DEFAULT_CLI_JWT_ISSUER;
}

function getCliJwtAudience(): string {
  return process.env.CLI_JWT_AUDIENCE?.trim() || DEFAULT_CLI_JWT_AUDIENCE;
}

async function getCliJwtVerificationKey(): Promise<CryptoKey> {
  const source = getCliJwtPublicKeyPem().replace(/\\n/g, "\n").trim();
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

  return normalizeAddress(session.address, "session.address");
}

async function verifyCliAccessToken(rawToken: string): Promise<CliBearerAuth | null> {
  const publicKey = await getCliJwtVerificationKey();
  const issuer = getCliJwtIssuer();
  const audience = getCliJwtAudience();

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

  const principal = deriveCliVerifiedPrincipal(claims);
  if (!principal) {
    return null;
  }

  const { hasToolsRead: _hasToolsRead, ...auth } = principal;
  if (!(await isCliSessionActive(auth))) {
    return null;
  }
  return auth;
}

async function isCliSessionActive(auth: CliBearerAuth): Promise<boolean> {
  let sessionId: bigint;
  try {
    sessionId = BigInt(auth.sessionId);
  } catch {
    return false;
  }

  const rows = await prismaPrimary(prisma).$queryRaw<ActiveCliSessionRow[]>`
    SELECT id
    FROM cobuild.cli_cli_sessions
    WHERE id = ${sessionId}
      AND owner_address = ${auth.ownerAddress}
      AND agent_key = ${auth.agentKey}
      AND revoked_at IS NULL
      AND expires_at > now()
    LIMIT 1
  `;

  return rows.length > 0;
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
