import {
  parseCliOauthAuthorizeQuery as parseCliOauthAuthorizeQueryFromWire,
  validateCliOauthAuthorizeRequest as validateCliOauthAuthorizeRequestFromWire,
  type CliOauthAuthorizeParseResult,
  type CliOauthAuthorizeRequest,
} from "@cobuild/wire";

export {
  CLI_OAUTH_PUBLIC_CLIENT_ID,
  CLI_OAUTH_RESPONSE_TYPE,
  CLI_OAUTH_REDIRECT_PATH,
  CLI_OAUTH_SUPPORTED_SCOPES,
  CLI_OAUTH_REQUIRED_SCOPES,
} from "@cobuild/wire";

export type { CliOauthAuthorizeRequest, CliOauthAuthorizeParseResult };

type SearchParamReader = Pick<URLSearchParams, "get">;

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
  return validateCliOauthAuthorizeRequestFromWire(input);
}

export function parseCliOauthAuthorizeQuery(
  searchParams: SearchParamReader
): CliOauthAuthorizeParseResult {
  return parseCliOauthAuthorizeQueryFromWire(searchParams);
}
