import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/domains/auth/session";
import { hasSignerRecord } from "@/lib/integrations/farcaster/signer-store";
import { getGoalOverviewData } from "@/lib/domains/goals/goal-data";
import { resolveGoalScope } from "@/lib/domains/goals/goal-scopes";
import { CreatePostForm } from "./create-post-form";
import { buildPageMetadata } from "@/lib/shared/page-metadata";

export const metadata = buildPageMetadata({
  title: "Create Post | Cobuild",
  description: "Compose a Farcaster or X post for Cobuild discussions.",
  robots: { index: false, follow: false },
});

type PageProps = {
  searchParams: Promise<{ embedUrl?: string }>;
};

export default async function CreatePostPage({ searchParams }: PageProps) {
  const session = await getSession();
  const hasSigner = session.farcaster?.fid ? await hasSignerRecord(session.farcaster.fid) : false;
  const { embedUrl } = await searchParams;
  const goalScope = await resolveGoalScopeFromEmbedUrl(embedUrl);
  const backHref = getDiscussionHref(goalScope?.url);

  return (
    <main className="w-full">
      <div className="border-border bg-background/80 sticky top-0 z-10 flex items-center gap-4 border-b px-4 py-3 backdrop-blur-sm md:px-6">
        <Link
          href={backHref}
          className="text-foreground hover:bg-accent rounded-full p-2 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">Create Post</h1>
      </div>
      <div className="mx-auto max-w-2xl p-4 pb-12 md:p-6 md:pb-12">
        <CreatePostForm hasSigner={hasSigner} goalScope={goalScope} />
      </div>
    </main>
  );
}

async function resolveGoalScopeFromEmbedUrl(embedUrl: string | undefined) {
  const parsedScope = resolveGoalScope(embedUrl);
  if (!parsedScope?.url) return null;

  try {
    const url = new URL(parsedScope.url);
    const goalRoute = url.pathname.split("/").filter(Boolean).pop();
    if (!goalRoute) return parsedScope;

    const overview = await getGoalOverviewData(goalRoute);
    return overview?.goalScope ?? parsedScope;
  } catch {
    return parsedScope;
  }
}

function getDiscussionHref(scopeUrl: string | undefined): string {
  if (!scopeUrl) return "/goals";
  try {
    const url = new URL(scopeUrl);
    const normalizedPath = url.pathname.replace(/\/+$/, "");
    if (!normalizedPath) return "/goals";
    return `${normalizedPath}/discussion`;
  } catch {
    return "/goals";
  }
}
