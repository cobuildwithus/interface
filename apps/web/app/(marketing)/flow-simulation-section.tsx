"use client";

import type { ComponentProps, ReactNode, Key } from "react";
import { useMemo, useState } from "react";
import { GlossaryTerm } from "@/components/common/glossary-term";
import { GoalTopicToggle } from "@/components/common/goal-topic-toggle";
import { DaoFlowDiagram } from "@/components/visuals/dao-flow-diagram/dao-flow-diagram";
import {
  buildEvents,
  TOPIC_BY_ID,
  TOPIC_OPTIONS,
  TOPICS,
  type TopicId,
} from "./flow-simulation/data";

type FlowSimulationCopyProps = {
  className?: string;
  headingClassName: string;
  descriptionClassName: string;
  toggleClassName: string;
  description: ReactNode;
  activeId: TopicId;
  onChange: (id: TopicId) => void;
};

type FlowSimulationDiagramProps = {
  height: number;
  diagramKey: Key;
  className?: string;
  withOrbit?: boolean;
} & Omit<ComponentProps<typeof DaoFlowDiagram>, "height">;

function FlowSimulationHeading({ className }: { className: string }) {
  return (
    <h2 className={className}>
      AI coordinates
      <br />
      <span className="whitespace-nowrap text-neutral-500">Humans build</span>
    </h2>
  );
}

function StakingTerm() {
  return (
    <GlossaryTerm
      term="Staking"
      title="Stake-based funding"
      definition="The amount of money a participant locks behind a budget. Higher stakes mean stronger influence over where funds flow. Staker rewards unlock only when the goal succeeds."
    />
  );
}

function FlowSimulationCopy({
  className,
  headingClassName,
  descriptionClassName,
  toggleClassName,
  description,
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

export function FlowSimulationSection() {
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

  return (
    <section className="relative overflow-hidden pt-16 pb-24">
      <div className="pointer-events-none absolute inset-0 opacity-[0.06]">
        <div className="absolute top-20 left-0 h-40 w-40 rounded-full border border-white/10" />
        <div className="absolute top-10 right-[-30px] h-64 w-64 rounded-full border border-white/10" />
        <div className="absolute bottom-10 left-1/3 h-24 w-24 rounded-full border border-white/10" />
      </div>

      <div className="relative z-10">
        <div className="flex flex-col gap-8 lg:hidden">
          <FlowSimulationCopy
            className="px-8 md:px-16"
            headingClassName="text-2xl leading-[1.1] font-bold tracking-tight uppercase sm:text-3xl md:text-4xl"
            descriptionClassName="mt-5 text-sm leading-relaxed text-neutral-400 md:text-base"
            toggleClassName="mt-8"
            description={
              <>
                AI allocates capital effectively to goals and their allocation mechanisms.{" "}
                <StakingTerm /> steers the money stream in real time.
              </>
            }
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
            description={
              <>
                People fund ambitious goals. AI allocates capital to pay contributors around the
                world. <StakingTerm /> steers the money stream in real time.
              </>
            }
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
