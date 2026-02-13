"use client";

import { useEffect, useRef } from "react";
import { DEMO_EVENTS } from "./dao-flow-data";
import { startDaoFlowDiagram } from "./dao-flow-engine";
import { PARAMS } from "./dao-flow-params";
import type { AutoMechTemplate, DaoEvent } from "./dao-flow-types";

export type { ActorId, AutoMechTemplate, DaoEvent } from "./dao-flow-types";

export function DaoFlowDiagram({
  height = 560,
  events = DEMO_EVENTS,
  autoMechTemplates,
  autoMechDelay = PARAMS.autoMechDelay,
  replacementBudgetTitles,
  flowTasks,
  roundTasks,
}: {
  height?: number;
  events?: DaoEvent[];
  autoMechTemplates?: AutoMechTemplate[];
  autoMechDelay?: number;
  replacementBudgetTitles?: string[];
  flowTasks?: string[];
  roundTasks?: string[];
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    return startDaoFlowDiagram({
      host: ref.current,
      events,
      autoMechTemplates,
      autoMechDelay,
      replacementBudgetTitles,
      flowTasks,
      roundTasks,
    });
  }, [events, autoMechDelay, autoMechTemplates, replacementBudgetTitles, flowTasks, roundTasks]);

  return (
    <div
      ref={ref}
      style={{
        width: "100%",
        height,
        borderRadius: 16,
        overflow: "hidden",
        background: "transparent",
      }}
    />
  );
}
