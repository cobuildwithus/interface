import { NextResponse } from "next/server";
import { getPrivyIdToken } from "@/lib/domains/auth/session";
import { fetchChatApi } from "@/lib/domains/chat/server-api";
import { requireCliSessionAddress } from "@/lib/server/cli/auth";
import { CliAuthError } from "@/lib/server/cli/errors";
import { cliErrorResponse, parseJsonStrict } from "@/lib/server/cli/http";
import { forbiddenCrossOriginResponse } from "@/lib/server/http/same-origin";
import { validateCliOauthAuthorizeRequest } from "@/lib/shared/cli-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OauthAuthorizeBody = {
  responseType: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  state: string;
  agentKey: string;
  label?: string;
};

type OauthAuthorizeCodePayload = {
  code?: unknown;
  state?: unknown;
  redirect_uri?: unknown;
};

class UpstreamRequestError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function oauthAuthorizeErrorResponse(error: unknown) {
  if (error instanceof UpstreamRequestError) {
    const status = error.status >= 400 && error.status < 500 ? error.status : 502;
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
      },
      {
        status,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
  return null;
}

function parseOauthAuthorizeBody(input: unknown) {
  const record = (input ?? {}) as Record<string, unknown>;
  return validateCliOauthAuthorizeRequest({
    responseType: typeof record.responseType === "string" ? record.responseType : "",
    clientId: typeof record.clientId === "string" ? record.clientId : "",
    redirectUri: typeof record.redirectUri === "string" ? record.redirectUri : "",
    scope: typeof record.scope === "string" ? record.scope : "",
    codeChallenge: typeof record.codeChallenge === "string" ? record.codeChallenge : "",
    codeChallengeMethod:
      typeof record.codeChallengeMethod === "string" ? record.codeChallengeMethod : "",
    state: typeof record.state === "string" ? record.state : "",
    agentKey: typeof record.agentKey === "string" ? record.agentKey : "",
    ...(typeof record.label === "string" ? { label: record.label } : {}),
  });
}

function parseOauthAuthorizeCodePayload(payload: unknown): {
  code: string;
  state: string | null;
  redirectUri: string | null;
} {
  const data = (payload ?? {}) as OauthAuthorizeCodePayload;
  if (typeof data.code !== "string" || !data.code.trim()) {
    throw new UpstreamRequestError(
      502,
      "Upstream response did not include a valid authorization code."
    );
  }

  return {
    code: data.code,
    state: typeof data.state === "string" && data.state.trim() ? data.state : null,
    redirectUri:
      typeof data.redirect_uri === "string" && data.redirect_uri.trim() ? data.redirect_uri : null,
  };
}

async function requestAuthorizationCode(body: OauthAuthorizeBody): Promise<string> {
  const identityToken = await getPrivyIdToken();
  if (!identityToken) {
    throw new CliAuthError(401, "Unauthorized");
  }

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetchChatApi("/oauth/authorize-code", {
      identityToken,
      init: {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          client_id: body.clientId,
          redirect_uri: body.redirectUri,
          scope: body.scope,
          code_challenge: body.codeChallenge,
          code_challenge_method: body.codeChallengeMethod,
          state: body.state,
          agent_key: body.agentKey,
          ...(body.label ? { label: body.label } : {}),
        }),
        cache: "no-store",
      },
    });
  } catch {
    throw new UpstreamRequestError(502, "Upstream request failed.");
  }

  const payload = await upstreamResponse.json().catch(() => null);
  if (!upstreamResponse.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      payload !== null &&
      typeof (payload as { error_description?: unknown }).error_description === "string"
        ? (payload as { error_description: string }).error_description
        : "Authorization code request failed.";
    throw new UpstreamRequestError(upstreamResponse.status, message);
  }

  const upstream = parseOauthAuthorizeCodePayload(payload);
  if (upstream.state && upstream.state !== body.state) {
    throw new UpstreamRequestError(502, "Upstream state did not match authorization request.");
  }
  if (upstream.redirectUri && upstream.redirectUri !== body.redirectUri) {
    throw new UpstreamRequestError(
      502,
      "Upstream redirect URI did not match authorization request."
    );
  }

  const redirectUrl = new URL(body.redirectUri);
  redirectUrl.searchParams.set("code", upstream.code);
  redirectUrl.searchParams.set("state", body.state);
  return redirectUrl.toString();
}

export async function POST(request: Request) {
  try {
    const forbiddenResponse = forbiddenCrossOriginResponse(request, {
      requireOriginHeader: true,
    });
    if (forbiddenResponse) {
      return forbiddenResponse;
    }

    await requireCliSessionAddress();
    const parsedBody = parseOauthAuthorizeBody(await parseJsonStrict(request));
    const redirectTo = await requestAuthorizationCode({
      responseType: parsedBody.responseType,
      clientId: parsedBody.clientId,
      redirectUri: parsedBody.redirectUri,
      scope: parsedBody.scope,
      codeChallenge: parsedBody.codeChallenge,
      codeChallengeMethod: parsedBody.codeChallengeMethod,
      state: parsedBody.state,
      agentKey: parsedBody.agentKey,
      ...(parsedBody.label ? { label: parsedBody.label } : {}),
    });

    return NextResponse.json(
      {
        ok: true,
        redirectTo,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    return cliErrorResponse(error, {
      tag: "oauth-authorize",
      extraHandlers: [oauthAuthorizeErrorResponse],
    });
  }
}
