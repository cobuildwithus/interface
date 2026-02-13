import { Suspense } from "react";
import type { GoalAiContextResponse } from "@/lib/domains/goals/ai-context/context";
import { getCobuildAiContext } from "@/lib/domains/goals/ai-context/context";
import { Skeleton } from "@/components/ui/skeleton";
import { ContextSection } from "./context-section";
import { ContextCopyButton } from "./context-copy-button";
import { ContextStatsSection } from "./context-stats-section";
import { ContextStatsSkeleton } from "./context-stats-skeleton";
import { RecentEdits } from "./recent-edits";
import {
  getCobuildPromptContent,
  getCobuildPromptDirectoryUrl,
  getCobuildPromptEditUrls,
} from "@/lib/domains/content/github-prompts";
import { getStatsContent } from "./stats-content";
import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";

const sectionDefinitions = [
  {
    key: "systemPrompt",
    title: "System Prompt",
    subtitle: "Core instructions that shape AI behavior and responses",
    accentColor: "bg-gradient-to-br from-emerald-500 to-teal-600",
  },
  {
    key: "manifesto",
    title: "Manifesto",
    subtitle: "Our founding vision and why we're building Cobuild",
    accentColor: "bg-gradient-to-br from-amber-500 to-orange-600",
  },
  {
    key: "billOfRights",
    title: "Bill of Rights",
    subtitle: "Fundamental principles and protections for all participants",
    accentColor: "bg-gradient-to-br from-blue-500 to-indigo-600",
  },
  {
    key: "charter",
    title: "Goal Charter",
    subtitle: "Success conditions, operating principles, and budget policy",
    accentColor: "bg-gradient-to-br from-violet-500 to-purple-600",
  },
] as const;

export async function ContextContent() {
  const statsPromise = getCobuildAiContext();
  const [prompts, editUrls, directoryUrl] = await Promise.all([
    getCobuildPromptContent(),
    getCobuildPromptEditUrls(),
    getCobuildPromptDirectoryUrl(),
  ]);

  const sections = sectionDefinitions.map((section) => ({
    ...section,
    content: prompts[section.key],
    editUrl: editUrls[section.key],
  }));

  const baseContent = sections
    .map((section) => `# ${section.title}\n\n${section.content}`)
    .join("\n\n---\n\n");

  return (
    <div>
      {/* Section header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-border h-px w-8" />
          <h2 className="text-muted-foreground font-mono text-sm font-medium tracking-wider uppercase">
            Prompts
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2 font-mono text-xs" asChild>
            <a href={directoryUrl} target="_blank" rel="noreferrer">
              <Github className="size-3.5" />
              Edit
            </a>
          </Button>
          <Suspense fallback={<CopyAllSkeleton />}>
            <CopyAllWithStats statsPromise={statsPromise} baseContent={baseContent} />
          </Suspense>
        </div>
      </div>

      {/* Document sections */}
      <div className="space-y-3">
        {sections.map((section, i) => (
          <ContextSection
            key={section.title}
            index={i + 1}
            title={section.title}
            subtitle={section.subtitle}
            content={section.content}
            editUrl={section.editUrl}
            accentColor={section.accentColor}
          />
        ))}

        <Suspense fallback={<ContextStatsSkeleton />}>
          <ContextStatsSection statsPromise={statsPromise} />
        </Suspense>
      </div>

      {/* Recent Edits section */}
      <RecentEdits />
    </div>
  );
}

export function ContextContentSkeleton() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-border h-px w-8" />
          <h2 className="text-muted-foreground font-mono text-sm font-medium tracking-wider uppercase">
            Prompts
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-36 rounded-md" />
          <CopyAllSkeleton />
        </div>
      </div>

      <div className="space-y-3">
        {Array.from({ length: sectionDefinitions.length }).map((_, index) => (
          <div key={`prompt-skeleton-${index}`} className="bg-card/50 rounded-lg border p-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-64" />
              </div>
            </div>
          </div>
        ))}
        <ContextStatsSkeleton />
      </div>
    </div>
  );
}

async function CopyAllWithStats({
  statsPromise,
  baseContent,
}: {
  statsPromise: Promise<GoalAiContextResponse>;
  baseContent: string;
}) {
  const statsContent = await getStatsContent(statsPromise);
  const allContent = [baseContent, `# Live Stats API\n\n${statsContent}`].join("\n\n---\n\n");

  return (
    <ContextCopyButton
      value={allContent}
      variant="outline"
      size="sm"
      showLabel
      label="Copy"
      className="gap-2 font-mono text-xs"
    />
  );
}

function CopyAllSkeleton() {
  return <Skeleton className="h-9 w-[110px] rounded-md" />;
}
