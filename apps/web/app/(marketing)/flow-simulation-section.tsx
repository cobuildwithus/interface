"use client";

import type { ComponentProps, ReactNode, Key } from "react";
import { useEffect, useMemo, useState } from "react";
import { GoalTopicToggle } from "@/components/common/goal-topic-toggle";
import { DaoFlowDiagram } from "@/components/visuals/dao-flow-diagram/dao-flow-diagram";
import {
  buildEvents,
  TOPIC_BY_ID,
  TOPIC_OPTIONS,
  TOPICS,
  type TopicId,
} from "./flow-simulation/data";

const MIN_LANDING_OFFSET_PX = 96;
const MAX_LANDING_OFFSET_PX = 160;
const VIEWPORT_LANDING_OFFSET_RATIO = 0.18;

type FlowSimulationCopyProps = {
  className?: string;
  headingClassName: string;
  descriptionClassName: string;
  toggleClassName: string;
  blurbClassName: string;
  description: ReactNode;
  activeBlurb: string;
  activeId: TopicId;
  onChange: (id: TopicId) => void;
};

type FlowSimulationDiagramProps = {
  height: number;
  diagramKey: Key;
  className?: string;
  withOrbit?: boolean;
} & Omit<ComponentProps<typeof DaoFlowDiagram>, "height">;

type FlowSimulationSectionProps = {
  sectionId?: string;
};

function getLandingOffsetPx() {
  return Math.min(
    MAX_LANDING_OFFSET_PX,
    Math.max(MIN_LANDING_OFFSET_PX, Math.round(window.innerHeight * VIEWPORT_LANDING_OFFSET_RATIO))
  );
}

function prefersReducedMotion() {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function getLandingScrollTop(target: HTMLElement) {
  return Math.max(
    0,
    Math.round(window.scrollY + target.getBoundingClientRect().top - getLandingOffsetPx())
  );
}

function FlowSimulationHeading({ className }: { className: string }) {
  return (
    <h2 className={className}>
      AI coordinates
      <br />
      <span className="whitespace-nowrap text-neutral-500">Humans build</span>
    </h2>
  );
}

function FlowSimulationCopy({
  className,
  headingClassName,
  descriptionClassName,
  toggleClassName,
  blurbClassName,
  description,
  activeBlurb,
  activeId,
  onChange,
}: FlowSimulationCopyProps) {
  return (
    <div className={className}>
      <FlowSimulationHeading className={headingClassName} />
      <p className={descriptionClassName}>{description}</p>
      <div className={toggleClassName}>
        <GoalTopicToggle topics={TOPIC_OPTIONS} value={activeId} onChange={onChange} />
      </div>
      <p className={blurbClassName}>{activeBlurb}</p>
    </div>
  );
}

function FlowSimulationDiagram({
  height,
  diagramKey,
  className,
  withOrbit = false,
  ...props
}: FlowSimulationDiagramProps) {
  const wrapperClassName = className ? `relative ${className}` : "relative";

  return (
    <div className={wrapperClassName}>
      {withOrbit ? (
        <div className="absolute top-10 -left-8 h-[520px] w-[520px] rounded-full border border-white/5 blur-[1px]" />
      ) : null}
      <DaoFlowDiagram key={diagramKey} height={height} {...props} />
    </div>
  );
}

export function FlowSimulationSection({ sectionId }: FlowSimulationSectionProps) {
  const [activeId, setActiveId] = useState<TopicId>("longevity");
  const activeTopic = TOPIC_BY_ID[activeId] ?? TOPICS[0];
  const handleTopicChange = (id: TopicId) => setActiveId(id);

  const events = useMemo(() => buildEvents(activeTopic), [activeTopic]);
  const diagramProps = {
    events,
    autoMechTemplates: activeTopic.mechs,
    replacementBudgetTitles: activeTopic.replacementBudgets ?? activeTopic.budgets,
    flowTasks: activeTopic.flowTasks,
    roundTasks: activeTopic.roundTasks,
  };

  useEffect(() => {
    if (!sectionId) {
      return;
    }

    const hash = `#${sectionId}`;

    const scrollToSection = (behavior: ScrollBehavior) => {
      const target = document.getElementById(sectionId);
      if (!target) {
        return;
      }

      const nextTop = getLandingScrollTop(target);
      if (Math.abs(window.scrollY - nextTop) < 2) {
        return;
      }

      window.scrollTo({ top: nextTop, behavior });
    };

    const handleDocumentClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) {
        return;
      }

      const trigger = event.target.closest(`a[href="${hash}"]`);
      if (!(trigger instanceof HTMLAnchorElement)) {
        return;
      }

      const target = document.getElementById(sectionId);
      if (!target) {
        return;
      }

      event.preventDefault();
      window.history.replaceState(window.history.state, "", hash);
      window.scrollTo({
        top: getLandingScrollTop(target),
        behavior: prefersReducedMotion() ? "auto" : "smooth",
      });
    };

    document.addEventListener("click", handleDocumentClick);

    if (window.location.hash === hash) {
      scrollToSection("auto");
    }

    return () => {
      document.removeEventListener("click", handleDocumentClick);
    };
  }, [sectionId]);

  return (
    <section className="relative min-h-screen overflow-hidden pt-16 pb-24">
      <div className="pointer-events-none absolute inset-0 opacity-[0.06]">
        <div className="absolute top-20 left-0 h-40 w-40 rounded-full border border-white/10" />
        <div className="absolute top-10 right-[-30px] h-64 w-64 rounded-full border border-white/10" />
        <div className="absolute bottom-10 left-1/3 h-24 w-24 rounded-full border border-white/10" />
      </div>

      <div id={sectionId} className="relative z-10 scroll-mt-32">
        <div className="flex flex-col gap-8 lg:hidden">
          <FlowSimulationCopy
            className="px-8 md:px-16"
            headingClassName="text-2xl leading-[1.1] font-bold tracking-tight uppercase sm:text-3xl md:text-4xl"
            descriptionClassName="mt-5 text-sm leading-relaxed text-neutral-400 md:text-base"
            toggleClassName="mt-8"
            blurbClassName="mt-4 text-xs leading-relaxed text-neutral-500 md:text-sm"
            description={
              <>
                Communities pool money to fund and build software they wish existed. AI coordinates
                budgets and routes payouts, while maintainers review work and decide what ships.
              </>
            }
            activeBlurb={activeTopic.blurb}
            activeId={activeId}
            onChange={handleTopicChange}
          />
          <FlowSimulationDiagram
            height={600}
            diagramKey={activeId}
            className="sm:px-8 md:px-16"
            {...diagramProps}
          />
        </div>

        <div className="hidden px-8 md:px-16 lg:flex lg:gap-8 lg:px-24">
          <FlowSimulationCopy
            className="flex w-1/3 shrink-0 flex-col"
            headingClassName="text-4xl leading-[1.1] font-bold tracking-tight uppercase xl:text-5xl"
            descriptionClassName="mt-5 text-base leading-relaxed text-neutral-400"
            toggleClassName="mt-10"
            blurbClassName="mt-5 max-w-sm text-sm leading-relaxed text-neutral-500"
            description={
              <>
                Communities pool money to fund and build software they wish existed. AI coordinates
                budgets and routes payouts, while maintainers review work and decide what ships.
              </>
            }
            activeBlurb={activeTopic.blurb}
            activeId={activeId}
            onChange={handleTopicChange}
          />
          <FlowSimulationDiagram
            height={650}
            diagramKey={activeId}
            className="w-2/3"
            withOrbit
            {...diagramProps}
          />
        </div>
      </div>
    </section>
  );
}
