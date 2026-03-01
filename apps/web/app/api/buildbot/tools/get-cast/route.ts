import { z } from "zod";
import { proxyBuildBotToolsRequest } from "@/lib/server/build-bot/tools-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GetCastRequestSchema = z
  .object({
    identifier: z.string().min(1).max(2048),
    type: z.enum(["hash", "url"]),
  })
  .strict();

export async function POST(request: Request) {
  return proxyBuildBotToolsRequest({
    request,
    schema: GetCastRequestSchema,
    upstreamPath: "/api/buildbot/tools/get-cast",
  });
}
