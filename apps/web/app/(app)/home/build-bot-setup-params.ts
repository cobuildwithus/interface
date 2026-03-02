export const BUILD_BOT_SETUP_QUERY_KEYS = [
  "buildBotSetup",
  "buildBotCallback",
  "buildBotState",
  "buildBotNetwork",
  "buildBotAgent",
] as const;

const SETUP_ENABLED_VALUE = "1";
const SETUP_STATE_PATTERN = /^[A-Za-z0-9_-]{32,200}$/;
const CALLBACK_PATH_PREFIX = "/api/buildbot/cli/callback/";
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);
const NETWORK_PATTERN = /^[A-Za-z0-9-]{1,64}$/;
const AGENT_PATTERN = /^[A-Za-z0-9._-]{1,64}$/;

type SearchParamReader = Pick<URLSearchParams, "get">;

export type BuildBotSetupRequest = {
  callbackUrl: string;
  state: string;
  network: string | null;
  agent: string | null;
};

export function mergeBuildBotSetupParams(
  searchParams: URLSearchParams,
  hashValue: string | null | undefined
): URLSearchParams {
  const merged = new URLSearchParams(searchParams.toString());
  if (!hashValue) {
    return merged;
  }

  const normalizedHash = hashValue.startsWith("#") ? hashValue.slice(1) : hashValue;
  if (!normalizedHash.trim()) {
    return merged;
  }

  const hashParams = new URLSearchParams(normalizedHash);
  for (const key of BUILD_BOT_SETUP_QUERY_KEYS) {
    if (merged.get(key) !== null) continue;
    const value = hashParams.get(key);
    if (value !== null) {
      merged.set(key, value);
    }
  }

  return merged;
}

function sanitizeOptional(value: string | null, pattern: RegExp): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return pattern.test(trimmed) ? trimmed : null;
}

function parseLoopbackCallback(rawCallback: string, state: string): string | null {
  let callbackUrl: URL;
  try {
    callbackUrl = new URL(rawCallback);
  } catch {
    return null;
  }

  if (callbackUrl.protocol !== "http:") return null;
  if (callbackUrl.username || callbackUrl.password) return null;
  if (!LOOPBACK_HOSTS.has(callbackUrl.hostname.toLowerCase())) return null;
  if (!callbackUrl.port) return null;
  if (callbackUrl.search || callbackUrl.hash) return null;
  if (callbackUrl.pathname !== `${CALLBACK_PATH_PREFIX}${state}`) return null;

  return callbackUrl.toString();
}

export function parseBuildBotSetupRequest(
  searchParams: SearchParamReader
): BuildBotSetupRequest | null {
  if (searchParams.get("buildBotSetup") !== SETUP_ENABLED_VALUE) {
    return null;
  }

  const state = searchParams.get("buildBotState");
  const rawCallback = searchParams.get("buildBotCallback");
  if (!state || !rawCallback) {
    return null;
  }

  if (!SETUP_STATE_PATTERN.test(state)) {
    return null;
  }

  const callbackUrl = parseLoopbackCallback(rawCallback, state);
  if (!callbackUrl) {
    return null;
  }

  return {
    callbackUrl,
    state,
    network: sanitizeOptional(searchParams.get("buildBotNetwork"), NETWORK_PATTERN),
    agent: sanitizeOptional(searchParams.get("buildBotAgent"), AGENT_PATTERN),
  };
}
