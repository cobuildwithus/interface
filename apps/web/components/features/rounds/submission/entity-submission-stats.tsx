"use client";

import { useState } from "react";
import { Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AuthButton } from "@/components/ui/auth-button";
import { Currency } from "@/components/ui/currency";
import { BoostDialog } from "@/components/features/rounds/round-submission-drawer/boost-dialog";
import { BackersList } from "@/components/features/rounds/round-submission-drawer/backers-list";
import { EarningsBreakdown } from "@/components/features/rounds/round-submission-drawer/earnings-breakdown";
import { StatButton } from "@/components/features/rounds/round-submission-drawer/stat-button";
import { SwapsList } from "@/components/features/rounds/round-submission-drawer/swaps-list";
import { useEntitySubmissionData } from "@/lib/hooks/use-submission-data-entity";
import { cn } from "@/lib/shared/utils";
import type { IntentStats } from "@/lib/domains/token/intent-stats/intent-stats";
import type { CastIntentSwap } from "@/lib/domains/token/intent-swaps/intent-swaps.shared";
import type { CastEvalScore } from "@/types/farcaster";

type StatTab = "earnings" | "backers" | "volume";

type EntitySubmissionStatsProps = {
  entityId: string;
  username?: string;
  beneficiaryAddress?: `0x${string}`;
  authorFid?: number;
  source?: "farcaster" | "x";
  evalScore?: CastEvalScore | null;
  intentStats?: IntentStats | null;
  swaps: CastIntentSwap[];
  isSwapsLoading?: boolean;
  variant: "drawer" | "sidebar";
  contentClassName?: string;
  footerClassName?: string;
  hideFooter?: boolean;
  onBoostRecorded?: () => void;
};

export function EntitySubmissionStats({
  entityId,
  username,
  beneficiaryAddress,
  authorFid,
  source,
  evalScore,
  intentStats,
  swaps,
  isSwapsLoading = false,
  variant,
  contentClassName,
  footerClassName,
  hideFooter = false,
  onBoostRecorded,
}: EntitySubmissionStatsProps) {
  const [selectedTab, setSelectedTab] = useState<StatTab>("earnings");
  const [showBoostDialog, setShowBoostDialog] = useState(false);
  const router = useRouter();

  const data = useEntitySubmissionData(evalScore ?? null, intentStats ?? null, swaps);

  const handleBoostSuccess = () => {
    setSelectedTab("volume");
    if (onBoostRecorded) {
      onBoostRecorded();
      return;
    }
    router.refresh();
  };

  const boostButtonProps: React.ComponentProps<typeof Button> = {
    className: variant === "drawer" ? "w-full h-14" : "w-full h-12",
    onClick: () => setShowBoostDialog(true),
  };

  const contentClasses = cn(
    variant === "sidebar" ? "flex-1 overflow-y-auto p-4 pb-24 lg:pb-4" : undefined,
    contentClassName
  );

  const footerClasses = cn(
    "border-border shrink-0 border-t p-4",
    variant === "sidebar"
      ? "bg-background/80 fixed inset-x-0 bottom-0 z-50 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur lg:static lg:bg-background lg:pb-4"
      : "bg-background",
    footerClassName
  );

  return (
    <>
      <div className={contentClasses}>
        <div className="mb-4 flex gap-2">
          <StatButton
            selected={selectedTab === "earnings"}
            onClick={() => setSelectedTab("earnings")}
            value={<Currency value={data.totalEarnings} />}
            label="earnings"
          />
          <StatButton
            selected={selectedTab === "backers"}
            onClick={() => setSelectedTab("backers")}
            value={data.backersCount.toString()}
            label="backers"
          />
          <StatButton
            selected={selectedTab === "volume"}
            onClick={() => setSelectedTab("volume")}
            value={<Currency value={data.volume} />}
            label="volume"
          />
        </div>

        <div className="min-h-[150px]">
          {selectedTab === "earnings" && (
            <EarningsBreakdown
              key={variant}
              aiReward={data.aiReward}
              quadraticReward={data.quadraticReward}
              backersCount={data.eligibleBackersCount}
              winRate={evalScore?.winRate ?? null}
              sharePercent={evalScore?.share != null ? evalScore.share * 100 : null}
              volume={data.volume}
              isMobile={variant === "drawer"}
            />
          )}
          {selectedTab === "backers" && (
            <BackersList backers={data.backers} isLoading={isSwapsLoading} />
          )}
          {selectedTab === "volume" && <SwapsList swaps={swaps} isLoading={isSwapsLoading} />}
        </div>
      </div>

      {!hideFooter && (
        <div className={footerClasses}>
          {variant === "sidebar" ? (
            <AuthButton {...boostButtonProps}>
              <Zap size={16} />
              Boost
            </AuthButton>
          ) : (
            <Button {...boostButtonProps}>
              <Zap size={16} />
              Boost
            </Button>
          )}
        </div>
      )}

      <BoostDialog
        open={showBoostDialog}
        onOpenChange={setShowBoostDialog}
        username={username}
        beneficiaryAddress={beneficiaryAddress}
        castHash={entityId}
        authorFid={authorFid}
        source={source}
        onBoostSuccess={handleBoostSuccess}
      />
    </>
  );
}
