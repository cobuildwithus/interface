"use server";

import { createReplyPost } from "@/lib/server/farcaster-reply";

export type ReplyActionInput = {
  text: string;
  parentHash: string;
  parentAuthorFid: number | null;
  attachmentUrl?: string | null;
};

export type ReplyActionResult =
  | { ok: true; hash: string }
  | { ok: false; error: string; status: number };

export async function createReplyAction(input: ReplyActionInput): Promise<ReplyActionResult> {
  const result = await createReplyPost(input);
  if (!result.ok) {
    return { ok: false, error: result.error, status: result.status };
  }

  return { ok: true, hash: result.data.hash };
}
