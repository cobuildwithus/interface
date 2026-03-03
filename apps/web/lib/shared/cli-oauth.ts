const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);
const AGENT_KEY_PATTERN = /^[A-Za-z0-9._-]{1,64}$/;
const PKCE_CHALLENGE_PATTERN = /^[A-Za-z0-9_-]{43,128}$/;
const STATE_PATTERN = /^[A-Za-z0-9._~-]{8,512}$/;
const CLI_SETUP_PAYER_MODES = ["hosted", "local-generate", "local-key", "skip"] as const;

export const CLI_OAUTH_PUBLIC_CLIENT_ID = "buildbot_cli";
export const CLI_OAUTH_RESPONSE_TYPE = "code";
export const CLI_OAUTH_REDIRECT_PATH = "/auth/callback";
export const CLI_OAUTH_SUPPORTED_SCOPES = [
  "tools:read",
  "tools:write",
  "wallet:read",
  "wallet:execute",
  "offline_access",
] as const;
export const CLI_OAUTH_REQUIRED_SCOPES = ["offline_access"] as const;

const supportedScopeSet = new Set<string>(CLI_OAUTH_SUPPORTED_SCOPES);

type SearchParamReader = Pick<URLSearchParams, "get">;

export type CliOauthAuthorizeRequest = {
  responseType: "code";
  clientId: string;
  redirectUri: string;
  scope: string;
  scopes: string[];
  codeChallenge: string;
  codeChallengeMethod: "S256";
  state: string;
  agentKey: string;
  label?: string;
  payerMode?: (typeof CLI_SETUP_PAYER_MODES)[number];
};

export type CliOauthAuthorizeParseResult =
  | { ok: true; value: CliOauthAuthorizeRequest }
  | { ok: false; error: string };

function parseScopeEntries(scope: string): string[] {
  return scope
    .split(/\s+/)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function normalizeScopeEntries(scopeEntries: string[]): string[] {
  return Array.from(new Set(scopeEntries)).sort();
}

function validateScope(scope: string): { normalizedScope: string; scopes: string[] } {
  const entries = normalizeScopeEntries(parseScopeEntries(scope));
  if (entries.length === 0) {
    throw new Error("scope is required");
  }

  for (const entry of entries) {
    if (!supportedScopeSet.has(entry)) {
      throw new Error(`Unsupported scope: ${entry}`);
    }
  }

  for (const required of CLI_OAUTH_REQUIRED_SCOPES) {
    if (!entries.includes(required)) {
      throw new Error(`scope must include ${required}`);
    }
  }

  return {
    normalizedScope: entries.join(" "),
    scopes: entries,
  };
}

function validateRedirectUri(rawRedirectUri: string): string {
  let parsed: URL;
  try {
    parsed = new URL(rawRedirectUri);
  } catch {
    throw new Error("redirect_uri must be an absolute URL");
  }

  if (parsed.protocol !== "http:") {
    throw new Error("redirect_uri must use http loopback transport");
  }
  if (parsed.username || parsed.password) {
    throw new Error("redirect_uri must not include credentials");
  }
  if (!LOOPBACK_HOSTS.has(parsed.hostname.toLowerCase())) {
    throw new Error("redirect_uri must use a loopback host");
  }
  if (!parsed.port) {
    throw new Error("redirect_uri must include an explicit port");
  }
  if (parsed.search || parsed.hash) {
    throw new Error("redirect_uri must not include query params or fragments");
  }
  if (parsed.pathname !== CLI_OAUTH_REDIRECT_PATH) {
    throw new Error(`redirect_uri path must be ${CLI_OAUTH_REDIRECT_PATH}`);
  }

  return parsed.toString();
}

export function validateCliOauthAuthorizeRequest(input: {
  responseType: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  state: string;
  agentKey: string;
  label?: string;
  payerMode?: string;
}): CliOauthAuthorizeRequest {
  if (input.responseType !== CLI_OAUTH_RESPONSE_TYPE) {
    throw new Error("response_type must be code");
  }

  if (input.clientId !== CLI_OAUTH_PUBLIC_CLIENT_ID) {
    throw new Error("Unsupported client_id");
  }

  const redirectUri = validateRedirectUri(input.redirectUri.trim());
  const { normalizedScope, scopes } = validateScope(input.scope.trim());
  const codeChallenge = input.codeChallenge.trim();
  if (!PKCE_CHALLENGE_PATTERN.test(codeChallenge)) {
    throw new Error("code_challenge must be a valid base64url PKCE challenge");
  }
  if (input.codeChallengeMethod !== "S256") {
    throw new Error("code_challenge_method must be S256");
  }

  const state = input.state.trim();
  if (!STATE_PATTERN.test(state)) {
    throw new Error("state is invalid");
  }

  const agentKey = input.agentKey.trim();
  if (!AGENT_KEY_PATTERN.test(agentKey)) {
    throw new Error("agent_key is invalid");
  }

  const label = input.label?.trim();
  if (label && label.length > 128) {
    throw new Error("label must be 128 characters or less");
  }
  const payerMode = input.payerMode?.trim();
  if (
    payerMode &&
    !CLI_SETUP_PAYER_MODES.includes(payerMode as (typeof CLI_SETUP_PAYER_MODES)[number])
  ) {
    throw new Error("payer_mode is invalid");
  }

  return {
    responseType: CLI_OAUTH_RESPONSE_TYPE,
    clientId: CLI_OAUTH_PUBLIC_CLIENT_ID,
    redirectUri,
    scope: normalizedScope,
    scopes,
    codeChallenge,
    codeChallengeMethod: "S256",
    state,
    agentKey,
    ...(label ? { label } : {}),
    ...(payerMode ? { payerMode: payerMode as (typeof CLI_SETUP_PAYER_MODES)[number] } : {}),
  };
}

export function parseCliOauthAuthorizeQuery(
  searchParams: SearchParamReader
): CliOauthAuthorizeParseResult {
  const responseType = searchParams.get("response_type");
  const clientId = searchParams.get("client_id");
  const redirectUri = searchParams.get("redirect_uri");
  const scope = searchParams.get("scope");
  const codeChallenge = searchParams.get("code_challenge");
  const codeChallengeMethod = searchParams.get("code_challenge_method");
  const state = searchParams.get("state");
  const agentKey = searchParams.get("agent_key");
  const label = searchParams.get("label");
  const payerMode = searchParams.get("payer_mode");

  if (
    !responseType ||
    !clientId ||
    !redirectUri ||
    !scope ||
    !codeChallenge ||
    !codeChallengeMethod ||
    !state ||
    !agentKey
  ) {
    return {
      ok: false,
      error:
        "Missing required OAuth parameters. Start setup again from the CLI so all PKCE values are included.",
    };
  }

  try {
    const value = validateCliOauthAuthorizeRequest({
      responseType,
      clientId,
      redirectUri,
      scope,
      codeChallenge,
      codeChallengeMethod,
      state,
      agentKey,
      ...(label ? { label } : {}),
      ...(payerMode ? { payerMode } : {}),
    });
    return { ok: true, value };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Invalid OAuth authorization request",
    };
  }
}
