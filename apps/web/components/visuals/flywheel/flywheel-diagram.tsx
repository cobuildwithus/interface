"use client";

import { BubbleFlow } from "./bubble-flow";
import { BuildSection } from "./build-section";
import { EarnSection } from "./earn-section";
import { EngageSection } from "./engage-section";
import { InvestSection } from "./invest-section";
import { useFlywheelSimulation } from "./use-flywheel-simulation";

export function FlywheelDiagram() {
  const {
    engageBubbles,
    tokenBubbles,
    contentBubbles,
    energyBubbles,
    priceHistory,
    flashState,
    counts,
    onInteraction,
    workLabel,
    isWorkAnimating,
    fireworkTick,
    earnItems,
  } = useFlywheelSimulation();

  return (
    <div className="w-full">
      {/* Mobile/tablet: stacked layout */}
      <div className="flex flex-col items-center gap-6 px-4 xl:hidden">
        <EngageSection
          onInteraction={onInteraction}
          flashLike={flashState.like}
          flashComment={flashState.comment}
          flashRecast={flashState.recast}
          likeCount={counts.like}
          commentCount={counts.comment}
          recastCount={counts.recast}
        />
        <svg
          className="h-5 w-5 text-neutral-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
        <InvestSection priceHistory={priceHistory} />
        <svg
          className="h-5 w-5 text-neutral-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
        <BuildSection
          label={workLabel}
          fireworkTrigger={fireworkTick}
          isAnimating={isWorkAnimating}
        />
        <svg
          className="h-5 w-5 text-neutral-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
        <EarnSection items={earnItems} />
      </div>

      {/* Desktop: circular layout with bubble flows */}
      <div className="relative mx-auto hidden h-[920px] w-full max-w-[90rem] xl:block">
        <div className="absolute top-0 left-1/2 z-10 -translate-x-1/2">
          <div className="relative">
            <EngageSection
              onInteraction={onInteraction}
              flashLike={flashState.like}
              flashComment={flashState.comment}
              flashRecast={flashState.recast}
              likeCount={counts.like}
              commentCount={counts.comment}
              recastCount={counts.recast}
            />
            <div className="pointer-events-none absolute top-1/2 left-full ml-1 -translate-y-1/2">
              <BubbleFlow bubbles={engageBubbles} direction="arcTopRight" className="h-40 w-40" />
            </div>
          </div>
        </div>

        <div className="absolute top-1/2 -right-16 z-10 -translate-y-1/2 lg:-right-28">
          <div className="relative">
            <InvestSection priceHistory={priceHistory} />
            <div className="pointer-events-none absolute top-full left-1/2 mt-1">
              <BubbleFlow bubbles={tokenBubbles} direction="arcRightBottom" className="h-40 w-40" />
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-1/2 z-10 -translate-x-1/2">
          <div className="relative">
            <BuildSection
              label={workLabel}
              fireworkTrigger={fireworkTick}
              isAnimating={isWorkAnimating}
            />
            <div className="pointer-events-none absolute top-1/2 left-0">
              <BubbleFlow
                bubbles={energyBubbles}
                direction="arcBuildToEarn"
                className="h-40 w-40"
              />
            </div>
          </div>
        </div>

        <div className="absolute top-1/2 -left-16 z-10 -translate-y-1/2 lg:-left-28">
          <div className="relative">
            <EarnSection items={earnItems} />
            <div className="pointer-events-none absolute top-0 left-1/2">
              <BubbleFlow
                bubbles={contentBubbles}
                direction="arcEarnToEngage"
                className="h-40 w-40"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
