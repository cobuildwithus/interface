import { z } from "zod";
import { proxyBuildBotToolsRequest } from "@/lib/server/build-bot/tools-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CastPreviewRequestSchema = z
  .object({
    text: z.string().min(1).max(1024),
    embeds: z
      .array(
        z
          .object({
            url: z.string().min(1).max(2048),
          })
          .strict()
      )
      .max(2)
      .optional(),
    parent: z.string().min(1).max(512).optional(),
  })
  .strict();

export async function POST(request: Request) {
  return proxyBuildBotToolsRequest({
    request,
    schema: CastPreviewRequestSchema,
    upstreamPath: "/api/buildbot/tools/cast-preview",
  });
}
