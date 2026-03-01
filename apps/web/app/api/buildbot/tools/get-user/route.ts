import { z } from "zod";
import { proxyBuildBotToolsRequest } from "@/lib/server/build-bot/tools-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GetUserRequestSchema = z
  .object({
    fname: z.string().min(1).max(64),
  })
  .strict();

export async function POST(request: Request) {
  return proxyBuildBotToolsRequest({
    request,
    schema: GetUserRequestSchema,
    upstreamPath: "/api/buildbot/tools/get-user",
  });
}
