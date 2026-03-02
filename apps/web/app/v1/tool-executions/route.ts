import { proxyBuildBotToolsPassthroughRequest } from "@/lib/server/build-bot/tools-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CANONICAL_TOOL_EXECUTIONS_PATH = "/v1/tool-executions";

function withSearchParams(path: string, request: Request): string {
  const search = new URL(request.url).search;
  return search ? `${path}${search}` : path;
}

export async function POST(request: Request) {
  return proxyBuildBotToolsPassthroughRequest({
    request,
    upstreamPath: withSearchParams(CANONICAL_TOOL_EXECUTIONS_PATH, request),
    rateLimitPath: CANONICAL_TOOL_EXECUTIONS_PATH,
    upstreamMethod: "POST",
  });
}
