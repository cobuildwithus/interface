import { PageHeader } from "@/components/layout/page-header";
import { Suspense } from "react";
import { SettingsAllowanceSkeleton } from "@/components/common/skeletons/settings-allowance-skeleton";
import { SettingsRulesSkeleton } from "@/components/common/skeletons/settings-rules-skeleton";
import { getSession } from "@/lib/domains/auth/session";
import { buildPageMetadata } from "@/lib/shared/page-metadata";
import { AllowanceSection } from "./allowance-section";
import { FarcasterProfileSection } from "./farcaster-profile-section";
import { RulesSettingsSection } from "./rules-settings-section";
import { SettingsSidebar } from "./settings-sidebar";
import { loadSettingsSocialState } from "./social-state";

export const metadata = buildPageMetadata({
  title: "Settings | Cobuild",
  description: "Tune how Cobuild responds to X and Farcaster engagement.",
  robots: { index: false, follow: false },
});

export default async function SettingsPage() {
  const session = await getSession();
  const address = session.address ?? null;
  const socialState = await loadSettingsSocialState(session);
  const hasIdentity = Boolean(session.address || session.farcaster || session.twitter);

  return (
    <main className="w-full p-4 md:p-6">
      <PageHeader
        title="Settings"
        description="Tune how Cobuild responds to X and Farcaster engagement."
      />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Left column: Profile + Budget + Reaction rules */}
        <div className="min-w-0 flex-1 space-y-6">
          <FarcasterProfileSection hasIdentity={hasIdentity} socialState={socialState} />
          <Suspense fallback={<SettingsAllowanceSkeleton />}>
            <AllowanceSection address={address} />
          </Suspense>
          <Suspense fallback={<SettingsRulesSkeleton />}>
            <RulesSettingsSection address={address} />
          </Suspense>
        </div>

        {/* Right column: Wallet + Add funds + Connected accounts */}
        <div className="flex w-full flex-col gap-4 lg:sticky lg:top-6 lg:max-h-[calc(100vh-6rem)] lg:w-[280px] lg:self-start lg:overflow-y-auto">
          <SettingsSidebar address={address} socialState={socialState} />
        </div>
      </div>
    </main>
  );
}
