export type ActorId = "human1" | "human2" | "bot1" | "system";
export type NodeType = "goal" | "budget" | "mech" | "payee";
export type NodeStatus =
  | "proposed"
  | "listed"
  | "rejected"
  | "funding"
  | "active"
  | "capped"
  | "succeeded"
  | "failed"
  | "expired";

export type DaoEvent =
  | { t: number; type: "GOAL_CREATE"; id: string; title: string; deadline: number; by?: ActorId }
  | { t: number; type: "GOAL_DEPOSIT"; from: string; amount: number }
  | { t: number; type: "NOTE"; text: string }
  | {
      t: number;
      type: "BUDGET_PROPOSE";
      id: string;
      title: string;
      minBudget: number;
      maxBudget: number;
      fundingDeadline: number;
      executionDuration: number;
      by: ActorId;
    }
  | { t: number; type: "BUDGET_TCR_RESOLVE"; id: string; result: "LISTED" | "REJECTED" }
  | {
      t: number;
      type: "MECH_PROPOSE";
      id: string;
      parentBudgetId: string;
      mechType: "FLOW" | "ROUND";
      title: string;
      payees: { id: string; title: string }[];
      by: ActorId;
    }
  | { t: number; type: "MECH_TCR_RESOLVE"; id: string; result: "LISTED" | "REJECTED" }
  | { t: number; type: "STAKE_WEIGHT_SET"; nodeId: string; actor: ActorId; weight: number }
  | { t: number; type: "PAYEE_ADD"; mechId: string; actor: ActorId }
  | { t: number; type: "PAYEE_REMOVE"; mechId: string; actor: ActorId }
  | {
      t: number;
      type: "BUDGET_RESOLVE";
      id: string;
      result: "SUCCEEDED" | "FAILED";
      reason?: string;
    }
  | { t: number; type: "GOAL_RESOLVE"; result: "SUCCEEDED" | "FAILED" };

export type StakePos = { weight: number; exposure: number; conviction: number };

export type NodeState = {
  id: string;
  type: NodeType;
  parentId?: string;

  title: string;
  createdAt: number;

  status: NodeStatus;
  mechType?: "FLOW" | "ROUND";
  fadeOutAt?: number;
  fadeOutDuration?: number;

  treasury: number;
  spent: number;

  minBudget?: number;
  maxBudget?: number;
  fundingDeadline?: number;
  executionDuration?: number;
  activatedAt?: number;
  executionEndsAt?: number;
  failReason?: string;

  inRate: number;
  outRate: number;
};

export type LogOutcome =
  | "LISTED"
  | "REJECTED"
  | "SUCCEEDED"
  | "FAILED"
  | "STAKE_ADDED"
  | "STAKE_REMOVED";

export type EdgeKind = "stream" | "payout";

export type EdgeState = {
  id: string;
  from: string;
  to: string;
  kind: EdgeKind;

  rate: number;
  eligible: boolean;
  capped: boolean;
};

export type AutoMechTemplate = {
  mechType: "FLOW" | "ROUND";
  title: string;
  payees: { title: string }[];
};

export type SimState = {
  now: number;
  narration: string;

  goalId?: string;
  goalDeadline?: number;
  goalResolved?: "SUCCEEDED" | "FAILED";

  nodes: Record<string, NodeState>;
  stakes: Record<string, Partial<Record<ActorId, StakePos>>>;

  edges: EdgeState[];

  createdOrder: string[];

  lastEventType?: DaoEvent["type"];
  lastEventOutcome?: LogOutcome;

  autoMechSpawned: Set<string>;
};
