import type { ThreadCast } from "@/lib/integrations/farcaster/casts/types";

export type ReplyPostResult = { ok: true } | { ok: false; error: string; status?: number };

export type InlineReplyComposerProps = {
  targetCast: ThreadCast;
  rootCast: ThreadCast;
  onPost: (
    text: string,
    parentHash: string,
    parentAuthorFid: number | null,
    attachmentUrl: string | null
  ) => Promise<ReplyPostResult>;
  onCancel: () => void;
  hasSigner: boolean;
};
