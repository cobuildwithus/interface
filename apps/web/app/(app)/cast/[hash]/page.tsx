import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { normalizeCastHashRaw } from "@/lib/domains/rules/cast-rules/normalize";
import { getSession } from "@/lib/domains/auth/session";
import { isGlobalAdmin } from "@/lib/config/admins";
import { hasSignerRecord } from "@/lib/integrations/farcaster/signer-store";
import { createViewToken, isViewTokenEnabled } from "@/lib/domains/social/cast-view/token";
import { generateCastMetadata, getCastThread } from "@/lib/domains/social/cast-metadata";
import { ForumThread } from "./forum-thread";
import { CastViewTracker } from "./view-tracker";

type PageProps = {
  params: Promise<{ hash: string }>;
  searchParams: Promise<{ page?: string; all?: string; post?: string }>;
};

type MetadataProps = {
  params: Promise<{ hash: string }>;
};

export async function generateMetadata({ params }: MetadataProps): Promise<Metadata> {
  const { hash } = await params;
  return generateCastMetadata(hash);
}

export default async function CastPage({ params, searchParams }: PageProps) {
  const { hash } = await params;
  const { page: pageParam, all, post } = await searchParams;

  // all=1 means show all posts (page=0 signals this to the data layer)
  const showAll = all === "1";
  const page = showAll ? 0 : Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const [thread, session] = await Promise.all([
    getCastThread(hash, page, post ?? null),
    getSession(),
  ]);

  if (!thread) notFound();

  const isAdmin = isGlobalAdmin(session.address);
  const hasSignerPromise = session.farcaster?.fid
    ? hasSignerRecord(session.farcaster.fid)
    : Promise.resolve(false);

  const normalizedRoot = normalizeCastHashRaw(thread.root.hash);
  const tokenRequired = isViewTokenEnabled();
  const [requestHeaders, hasSigner] = await Promise.all([headers(), hasSignerPromise]);
  const viewToken = normalizedRoot ? createViewToken(normalizedRoot, requestHeaders) : null;
  return (
    <main className="w-full">
      <CastViewTracker hash={thread.root.hash} token={viewToken} tokenRequired={tokenRequired} />
      <div className="border-border bg-background/80 sticky top-0 z-10 flex items-center gap-4 border-b px-4 py-3 backdrop-blur-sm md:px-6">
        <Link
          href="/raise-1-mil/discussion"
          className="text-foreground hover:bg-accent rounded-full p-2 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">Thread</h1>
      </div>
      <div className="p-4 pb-12 md:p-6 md:pb-12">
        <ForumThread thread={thread} isAdmin={isAdmin} hasSigner={hasSigner} />
      </div>
    </main>
  );
}
