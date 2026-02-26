"use server";

import { createThreadPost } from "@/lib/server/farcaster-thread";

export type CreatePostActionInput = {
  title: string;
  content: string;
  attachmentUrls?: string[];
  embedUrl?: string | null;
};

export type CreatePostActionResult =
  | { ok: true; hash: string }
  | { ok: false; error: string; status: number };

export async function createPostAction(
  input: CreatePostActionInput
): Promise<CreatePostActionResult> {
  const result = await createThreadPost(input);
  if (!result.ok) {
    return { ok: false, error: result.error, status: result.status };
  }

  return { ok: true, hash: result.data.hash };
}
