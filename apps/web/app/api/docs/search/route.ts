import { z } from "zod";
import { proxyBuildBotToolsRequest } from "@/lib/server/build-bot/tools-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DocsSearchRequestSchema = z
  .object({
    query: z.string().min(1),
    limit: z.number().min(1).max(20).optional(),
  })
  .strict();

export async function POST(request: Request) {
  return proxyBuildBotToolsRequest({
    request,
    schema: DocsSearchRequestSchema,
    upstreamPath: "/api/docs/search",
  });
}
