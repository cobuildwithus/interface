import type { ThreadCast } from "@/lib/integrations/farcaster/casts/types";
import { PostContent } from "@/components/features/social/discussion/post-content";
import { QuotedPost } from "./quoted-post";
import { UserSidebar } from "./user-sidebar";

type ImageDialogApi = {
  openImage: (imageUrls: string[], index?: number) => void;
};

type ForumPostBodyProps = {
  cast: ThreadCast;
  parentCast: ThreadCast | null;
  castMap: Record<string, ThreadCast>;
  rootHash: string;
  imageAttachment: { url: string; label?: string | null } | null;
  imageDialog: ImageDialogApi;
};

export function ForumPostBody({
  cast,
  parentCast,
  castMap,
  rootHash,
  imageAttachment,
  imageDialog,
}: ForumPostBodyProps) {
  return (
    <div className="flex flex-col gap-4 p-4 md:flex-row md:gap-6">
      <div className="shrink-0 md:w-36">
        <UserSidebar cast={cast} />
      </div>

      <div className="border-border/40 border-t md:hidden" />

      <PostContent
        text={cast.text ?? null}
        quote={
          parentCast ? <QuotedPost cast={parentCast} castMap={castMap} rootHash={rootHash} /> : null
        }
        imageAttachment={imageAttachment}
        imageDialog={imageDialog}
      />
    </div>
  );
}
