import { proxyBuildBotToolsPassthroughRequest } from "@/lib/server/build-bot/tools-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CANONICAL_TOOLS_PATH = "/v1/tools";

function withSearchParams(path: string, request: Request): string {
  const search = new URL(request.url).search;
  return search ? `${path}${search}` : path;
}

export async function GET(request: Request) {
  return proxyBuildBotToolsPassthroughRequest({
    request,
    upstreamPath: withSearchParams(CANONICAL_TOOLS_PATH, request),
    rateLimitPath: CANONICAL_TOOLS_PATH,
    upstreamMethod: "GET",
  });
}
