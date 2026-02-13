import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getRoundById } from "@/lib/domains/rounds/rounds";
import { getSession } from "@/lib/domains/auth/session";
import { isAdminFor } from "@/lib/config/admins";
import { getCastByHash, getRoundSubmissionByPostId } from "@/lib/domains/rounds/submission-service";
import { getAiVerdict } from "@/lib/shared/ai-verdict";
import { truncateWords } from "@/lib/shared/text/truncate-words";
import { SubmissionSidebarSimple } from "./submission-sidebar-simple";
import { SubmissionContentSimple } from "./submission-content-simple";
import { SubmissionSidebarSkeleton } from "./submission-sidebar-skeleton";

type PageProps = {
  params: Promise<{ id: string; postId: string }>;
};

const DEFAULT_SUBMISSION_DESCRIPTION = "Submission details on Cobuild.";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id, postId } = await params;
  const round = await getRoundById(id);

  if (!round) {
    return {
      title: "Submission | Cobuild",
      description: DEFAULT_SUBMISSION_DESCRIPTION,
      robots: { index: false, follow: false },
    };
  }

  const submission = await getRoundSubmissionByPostId({
    roundId: id,
    postId,
    ruleId: round.primaryRule.id,
  });

  const roundTitle = round.title ?? `Round #${id}`;
  const displayText = submission?.displayText ?? submission?.rawText ?? "";
  const shortTitle = truncateWords(displayText, 8, "Submission");
  const authorLabel = submission?.displayName || submission?.handle || null;
  const title = authorLabel
    ? `${authorLabel} in ${roundTitle} | Cobuild`
    : `${roundTitle}: ${shortTitle} | Cobuild`;

  return {
    title,
    description: truncateWords(displayText, 40, DEFAULT_SUBMISSION_DESCRIPTION),
    robots: { index: false, follow: false },
  };
}

export default async function SubmissionPage({ params }: PageProps) {
  const { id, postId } = await params;

  const [round, session] = await Promise.all([getRoundById(id), getSession()]);
  if (!round) notFound();

  const submission = await getRoundSubmissionByPostId({
    roundId: id,
    postId,
    ruleId: round.primaryRule.id,
  });

  if (!round || !submission) notFound();

  const beneficiaryAddress = submission.beneficiaryAddress ?? undefined;
  const isAdmin = isAdminFor(session.address, round.primaryRule.admins);

  const displayText = submission.displayText ?? submission.rawText ?? "";
  const createdAtDate = submission.createdAt ? new Date(submission.createdAt) : null;

  const cast =
    submission.source === "farcaster"
      ? await getCastByHash(submission.entityId, round.primaryRule.id, id)
      : null;
  const authorFid = cast?.author.fid;

  const aiVerdict =
    submission.aiOutput && Object.keys(submission.aiOutput.output).length > 0
      ? getAiVerdict(submission.aiOutput.output)
      : null;

  return (
    <main className="flex flex-col lg:h-[calc(100vh-3.5rem)] lg:flex-row">
      {/* Left: Post content */}
      <div className="border-border border-b p-6 px-4 lg:flex-1 lg:overflow-y-auto lg:border-r lg:border-b-0">
        <SubmissionContentSimple
          roundId={id}
          postId={submission.postId}
          source={submission.source}
          url={submission.url}
          displayText={displayText}
          handle={submission.handle}
          displayName={submission.displayName}
          avatarUrl={submission.avatarUrl}
          createdAt={createdAtDate}
          isAdmin={isAdmin}
          ruleId={round.primaryRule.id}
          mediaUrls={submission.mediaUrls}
        />
      </div>

      {/* Right: Stats & actions sidebar */}
      <div className="w-full lg:w-[400px] lg:shrink-0 lg:overflow-y-auto">
        <Suspense fallback={<SidebarSkeleton />}>
          <SidebarLoader
            entityId={submission.entityId}
            roundId={id}
            handle={submission.handle}
            beneficiaryAddress={beneficiaryAddress}
            isAdmin={isAdmin}
            aiVerdict={aiVerdict}
            authorFid={authorFid}
            source={submission.source}
          />
        </Suspense>
      </div>
    </main>
  );
}

type SidebarLoaderProps = {
  entityId: string;
  roundId: string;
  handle: string;
  beneficiaryAddress: `0x${string}` | undefined;
  isAdmin: boolean;
  aiVerdict: ReturnType<typeof getAiVerdict> | null;
  authorFid: number | undefined;
  source: "farcaster" | "x";
};

function SidebarLoader({
  entityId,
  roundId,
  handle,
  beneficiaryAddress,
  isAdmin,
  aiVerdict,
  authorFid,
  source,
}: SidebarLoaderProps) {
  return (
    <SubmissionSidebarSimple
      entityId={entityId}
      roundId={roundId}
      username={handle}
      beneficiaryAddress={beneficiaryAddress}
      isAdmin={isAdmin}
      aiVerdict={aiVerdict}
      authorFid={authorFid}
      source={source}
    />
  );
}

function SidebarSkeleton() {
  return <SubmissionSidebarSkeleton />;
}
