import type { GoalTopicOption } from "@/components/common/goal-topic-toggle";
import type { ActorId } from "@/components/visuals/dao-flow-diagram/dao-flow-diagram";

export type BudgetTemplate = {
  id: string;
  proposeAt: number;
  resolveAt: number;
  minBudget: number;
  maxBudget: number;
  fundingDeadline: number;
  executionDuration: number;
  by: ActorId;
};

export type MechTemplate = {
  id: string;
  mechType: "FLOW" | "ROUND";
  title: string;
  payees: { id: string; title: string }[];
};

export type TopicConfig = {
  id: string;
  label: string;
  blurb: string;
  goalTitle: string;
  note: string;
  budgets: string[];
  mechs: MechTemplate[];
  icon: GoalTopicOption["icon"];
  replacementBudgets?: string[];
  /** Topic-specific flow titles for auto-spawned mechs */
  flowTasks?: string[];
  /** Topic-specific round titles for auto-spawned mechs */
  roundTasks?: string[];
};

export type StakeEvent = { t: number; actor: ActorId; weight: number };
export type StakePlan = Record<string, StakeEvent[]>;
