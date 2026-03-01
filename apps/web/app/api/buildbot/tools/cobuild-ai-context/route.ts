import { z } from "zod";
import { proxyBuildBotToolsRequest } from "@/lib/server/build-bot/tools-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CobuildAiContextRequestSchema = z.object({}).strict();

export async function POST(request: Request) {
  return proxyBuildBotToolsRequest({
    request,
    schema: CobuildAiContextRequestSchema,
    upstreamPath: "/api/buildbot/tools/cobuild-ai-context",
  });
}
