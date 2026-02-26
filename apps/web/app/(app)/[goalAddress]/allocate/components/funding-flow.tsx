import { motion } from "motion/react";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Currency } from "@/components/ui/currency";
import type { SGSummary } from "./types";
import { formatFullNumber, statusConfig } from "./utils";

type FundingFlowProps = {
  subGoals: SGSummary[];
  treasuryBalance: number;
  systemStats: {
    dailyFlow: number;
  };
};

type SubGoalItemProps = {
  sg: SGSummary;
};

function SubGoalItem({ sg }: SubGoalItemProps) {
  const config = statusConfig[sg.status];
  const isActive = sg.status === "active";
  const isComplete = sg.status === "complete";
  const isDraft = sg.status === "draft";
  const needsStake = sg.status === "needsStake";

  const titleParts = sg.title.match(/^(.+?) by (.+)$/);
  const title = titleParts ? titleParts[1] : sg.title;
  const deadline = titleParts ? titleParts[2] : null;

  const hasMin = sg.minBudget !== undefined;
  const hasMax = sg.maxBudget !== undefined;
  const hasBudgetConstraints = hasMin || hasMax;
  const fillPercent = hasMax ? Math.min((sg.currentFunding / sg.maxBudget!) * 100, 100) : 50;
  const isUnderMin = hasMin && sg.currentFunding < sg.minBudget!;
  const isAtMax = hasMax && sg.currentFunding >= sg.maxBudget!;

  const showMin = hasMin && isUnderMin;
  const showMax = hasMax && !isUnderMin;

  return (
    <div className={`${isDraft && "opacity-50"}`}>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${isActive ? "bg-emerald-500" : config.bg}`} />
          <span className="text-sm font-medium">{title}</span>
        </div>
        {!isActive && !needsStake && !isDraft && (
          <span className={`text-xs ${config.color}`}>
            {isComplete ? "Goal Succeeded" : isAtMax ? "Funded" : config.label}
          </span>
        )}
      </div>

      {hasBudgetConstraints ? (
        <div className="space-y-1.5">
          <div className="relative">
            <div className="bg-muted relative h-8 overflow-hidden rounded-full">
              <motion.div
                className={`h-full origin-left rounded-full ${
                  isAtMax || isComplete
                    ? "bg-sky-500"
                    : needsStake
                      ? "bg-violet-500"
                      : isUnderMin
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                }`}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: hasMax ? fillPercent / 100 : 0.5 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
              <div className="absolute inset-0 flex items-center px-3">
                <span
                  className={`text-sm font-medium ${isDraft ? "text-muted-foreground" : "text-white"}`}
                >
                  <AnimatedNumber value={sg.currentFunding} format={formatFullNumber} />
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <div className="text-muted-foreground flex items-center gap-2">
              {deadline && !needsStake && <span>by {deadline}</span>}
              {isUnderMin && !needsStake && !isDraft && (
                <span className="flex items-center gap-1 text-amber-500">
                  <span className="h-1 w-1 rounded-full bg-amber-500" />
                  below min
                </span>
              )}
            </div>
            <div className="text-muted-foreground">
              {showMin && (
                <span className="text-foreground/70">{formatFullNumber(sg.minBudget!)}</span>
              )}
              {showMax && (
                <span className="text-foreground/70">{formatFullNumber(sg.maxBudget!)}</span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-muted h-8 overflow-hidden rounded-full">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${
              isActive ? "bg-emerald-500" : "bg-transparent"
            }`}
            style={{ width: "0%" }}
          />
        </div>
      )}
    </div>
  );
}

export function FundingFlow({ subGoals, treasuryBalance, systemStats }: FundingFlowProps) {
  const sections = [
    {
      label: "Active",
      items: subGoals.filter((sg) => sg.status === "active" || sg.status === "complete"),
    },
    {
      label: "Needs More Stake",
      items: subGoals.filter((sg) => sg.status === "needsStake"),
    },
    {
      label: "Drafts",
      items: subGoals.filter((sg) => sg.status === "draft"),
    },
  ];

  return (
    <section className="mt-12 border-t pt-8">
      <h2 className="text-muted-foreground mb-6 text-sm font-medium tracking-wider uppercase">
        Funding Flow
      </h2>

      <div className="bg-card/30 overflow-hidden rounded-2xl border">
        <div className="border-b bg-emerald-500/5 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-muted-foreground mb-1 text-xs">Treasury</div>
              <div className="text-2xl font-bold">
                <AnimatedNumber value={treasuryBalance} format={formatFullNumber} />
              </div>
            </div>
            <div className="text-right">
              <div className="text-muted-foreground mb-1 text-xs">Outflow</div>
              <div className="text-2xl font-bold text-emerald-500">
                <Currency value={systemStats.dailyFlow} animated compact />
                <span className="text-muted-foreground text-sm font-normal">/day</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8 p-6">
          {sections.map((section) =>
            section.items.length ? (
              <div key={section.label} className="space-y-5">
                <h3 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                  {section.label}
                </h3>
                {section.items.map((sg) => (
                  <SubGoalItem key={sg.id} sg={sg} />
                ))}
              </div>
            ) : null
          )}
        </div>
      </div>
    </section>
  );
}
