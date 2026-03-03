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
import { parseCliOauthAuthorizeQuery, type CliOauthAuthorizeRequest } from "@/lib/shared/cli-oauth";
import { CliOauthAuthorizeModal } from "./cli-oauth-authorize-modal";
import { CliSetupCompleteModal } from "./cli-setup-complete-modal";

type HomePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function toSingleValue(value: string | string[] | undefined): string | null {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }
  return null;
}

export const metadata = buildPageMetadata({
  title: "Home | Cobuild",
  description: "Your Cobuild dashboard for treasury, contributions, and activity.",
  robots: { index: false, follow: false },
});

export default async function HomePage({ searchParams }: HomePageProps) {
  const raw = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    const parsed = toSingleValue(value);
    if (parsed !== null) {
      query.set(key, parsed);
    }
  }

  let oauthRequest: CliOauthAuthorizeRequest | null = null;
  let oauthError: string | undefined;
  const rawPayerMode = query.get("payer_mode");
  const setupPayerMode =
    rawPayerMode === "hosted" ||
    rawPayerMode === "local-generate" ||
    rawPayerMode === "local-key" ||
    rawPayerMode === "skip"
      ? rawPayerMode
      : null;
  const showSetupCompleteModal = query.get("cli_setup_complete") === "1";
  const setupAgentKey = query.get("agent_key")?.trim() || "default";
  if (query.get("oauth_authorize") === "1" || query.has("response_type")) {
    const parsed = parseCliOauthAuthorizeQuery(query);
    if (parsed.ok) {
      oauthRequest = parsed.value;
    } else {
      oauthError = parsed.error;
    }
  }

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

      {oauthRequest || oauthError ? (
        <CliOauthAuthorizeModal request={oauthRequest} error={oauthError} />
      ) : showSetupCompleteModal ? (
        <CliSetupCompleteModal agentKey={setupAgentKey} payerMode={setupPayerMode} />
      ) : null}
    </main>
  );
}
