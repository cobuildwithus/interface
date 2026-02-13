import { PageHeader } from "@/components/layout/page-header";
import { Suspense } from "react";
import { SettingsAllowanceSkeleton } from "@/components/common/skeletons/settings-allowance-skeleton";
import { SettingsProfileSkeleton } from "@/components/common/skeletons/settings-profile-skeleton";
import { SettingsRulesSkeleton } from "@/components/common/skeletons/settings-rules-skeleton";
import { SettingsSidebarSkeleton } from "@/components/common/skeletons/settings-sidebar-skeleton";
import { buildPageMetadata } from "@/lib/shared/page-metadata";
import { AllowanceSection } from "./allowance-section";
import { FarcasterProfileSection } from "./farcaster-profile-section";
import { RulesSettingsSection } from "./rules-settings-section";
import { SettingsSidebar } from "./settings-sidebar";

export const metadata = buildPageMetadata({
  title: "Settings | Cobuild",
  description: "Tune how Cobuild responds to X and Farcaster engagement.",
  robots: { index: false, follow: false },
});

export default function SettingsPage() {
  return (
    <main className="w-full p-4 md:p-6">
      <PageHeader
        title="Settings"
        description="Tune how Cobuild responds to X and Farcaster engagement."
      />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Left column: Profile + Budget + Reaction rules */}
        <div className="min-w-0 flex-1 space-y-6">
          <Suspense fallback={<SettingsProfileSkeleton />}>
            <FarcasterProfileSection />
          </Suspense>
          <Suspense fallback={<SettingsAllowanceSkeleton />}>
            <AllowanceSection />
          </Suspense>
          <Suspense fallback={<SettingsRulesSkeleton />}>
            <RulesSettingsSection />
          </Suspense>
        </div>

        {/* Right column: Wallet + Add funds + Connected accounts */}
        <div className="flex w-full flex-col gap-4 lg:sticky lg:top-6 lg:max-h-[calc(100vh-6rem)] lg:w-[280px] lg:self-start lg:overflow-y-auto">
          <Suspense fallback={<SettingsSidebarSkeleton />}>
            <SettingsSidebar />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
