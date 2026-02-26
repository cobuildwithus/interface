import type { Metadata } from "next";
import { Suspense } from "react";
import { generateGoalMetadata } from "../metadata";
import { GridBackground } from "@/components/ui/grid-background";
import { PageHeader } from "@/components/layout/page-header";
import { ContextContent, ContextContentSkeleton } from "./context-content";
import { ContextTools } from "./context-tools";

export async function generateMetadata(): Promise<Metadata> {
  return generateGoalMetadata({
    pageName: "Prompts",
    description:
      "Overview of all prompts available to the AI model including manifesto, bill of rights, system prompt, and charter.",
    pathSuffix: "/prompts",
  });
}

export default function PromptsPage() {
  return (
    <main className="relative w-full">
      <GridBackground />

      <div className="relative w-full p-4 md:p-6">
        <PageHeader
          title="Prompts"
          description="Prompts for Cobuild's AI. Every conversation includes these docs and has access to these tools."
        />

        {/* Main content grid */}
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          {/* Documents section */}
          <section className="min-w-0 flex-1">
            <Suspense fallback={<ContextContentSkeleton />}>
              <ContextContent />
            </Suspense>
          </section>

          {/* Tools sidebar */}
          <aside className="flex w-full flex-col gap-4 lg:sticky lg:top-20 lg:w-[320px] lg:self-start">
            <div className="flex items-center gap-3">
              <div className="bg-border h-px w-6" />
              <h2 className="text-muted-foreground font-mono text-sm font-medium tracking-wider uppercase">
                Tools
              </h2>
            </div>
            <div className="bg-card/50 rounded-xl border p-4 backdrop-blur-sm">
              <ContextTools />
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
