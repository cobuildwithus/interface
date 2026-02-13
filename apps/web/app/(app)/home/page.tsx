import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { MillionMemberGoal } from "@/components/features/goals/million-member-goal";
import { PayEventsList } from "./pay-events-list";
import { PayEventsListSkeleton } from "@/components/common/skeletons/pay-events-list-skeleton";
import { TreasuryChart } from "./treasury-chart";
import { TreasuryChartSkeleton } from "@/components/common/skeletons/treasury-chart-skeleton";
import { RevnetActions } from "./revnet-actions";
import { RevnetActionsSkeleton } from "@/components/common/skeletons/revnet-actions-skeleton";
import { buildPageMetadata } from "@/lib/shared/page-metadata";

export const metadata = buildPageMetadata({
  title: "Home | Cobuild",
  description: "Your Cobuild dashboard for treasury, contributions, and activity.",
  robots: { index: false, follow: false },
});

export default function HomePage() {
  return (
    <main className="w-full p-4 md:p-6">
      <PageHeader title="Home" />

      <MillionMemberGoal />

      <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start">
        <div className="flex-1" />

        <aside className="flex w-full flex-col gap-8 lg:w-[360px] xl:w-[400px]">
          <section>
            <h2 className="text-muted-foreground mb-3 text-sm font-medium">Your Position</h2>
            <Suspense fallback={<RevnetActionsSkeleton />}>
              <RevnetActions />
            </Suspense>
          </section>

          <section>
            <h2 className="text-muted-foreground mb-3 text-sm font-medium">Treasury</h2>
            <Suspense fallback={<TreasuryChartSkeleton />}>
              <TreasuryChart />
            </Suspense>
          </section>

          <section>
            <h2 className="text-muted-foreground mb-3 text-sm font-medium">Recent Contributions</h2>
            <Suspense fallback={<PayEventsListSkeleton />}>
              <PayEventsList />
            </Suspense>
          </section>
        </aside>
      </div>
    </main>
  );
}
