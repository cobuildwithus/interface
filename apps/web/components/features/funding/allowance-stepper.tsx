"use client";

import dynamic from "next/dynamic";
import { SettingsAllowanceSkeleton } from "@/components/common/skeletons/settings-allowance-skeleton";

type AllowanceStepperProps = {
  initialAddress?: `0x${string}` | null;
  initialUsdcBalance?: string | null;
  initialBalanceUsd?: string | null;
};

export function AllowanceStepper(props: AllowanceStepperProps) {
  const AllowanceStepperClient = dynamic<AllowanceStepperProps>(
    async () =>
      (await import("@/components/features/funding/allowance-stepper-client"))
        .AllowanceStepperClient,
    {
      ssr: false,
      loading: () => <SettingsAllowanceSkeleton />,
    }
  );

  return <AllowanceStepperClient {...props} />;
}
