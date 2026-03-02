import { proxyBuildBotToolsPassthroughRequest } from "@/lib/server/build-bot/tools-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CANONICAL_TOOLS_PATH = "/v1/tools";

type RouteContext = {
  params: Promise<{ name: string }>;
};

function withSearchParams(path: string, request: Request): string {
  const search = new URL(request.url).search;
  return search ? `${path}${search}` : path;
}

export async function GET(request: Request, { params }: RouteContext) {
  const { name } = await params;
  const toolPath = `${CANONICAL_TOOLS_PATH}/${encodeURIComponent(name)}`;

  return proxyBuildBotToolsPassthroughRequest({
    request,
    upstreamPath: withSearchParams(toolPath, request),
    rateLimitPath: toolPath,
    upstreamMethod: "GET",
  });
}
