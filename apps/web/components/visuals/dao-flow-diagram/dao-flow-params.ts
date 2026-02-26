import type { NodeStatus } from "./dao-flow-types";

export const PARAMS = {
  minStakeBudget: 45,
  minStakeMech: 5,

  maxRatePerStakeUnitGoal: 18,
  maxRatePerStakeUnitBudget: 8,

  flowPixelsPerSecond: 260,
  particlesPerSecondAt1000: 5,
  payoutParticlesMultiplier: 3.5,
  payoutMinParticlesPerSecond: 6,
  payoutMaxParticlesPerSecond: 60,

  fadeOutSeconds: 4,
  replacementDelay: 3,
  autoMechDelay: 2,
  autoPayeeDelay: 1.6,

  agentActionLead: 6,
  agentActionHold: 2.6,
  agentOrbitRadius: 42,
  agentOrbitSpeed: 0.6,
  agentIdleOrbitRadius: 18,
  agentIdleOrbitSpeed: 0.2,
  agentMaxSpeed: 52,
  agentMaxAccel: 140,
  agentFriction: 0.88,
  agentSteerStrength: 2.4,
  agentArriveRadius: 60,
  agentPersonalSpaceBase: 70,
  agentPersonalSpaceBusy: 48,
  agentBoundaryForce: 0.4,

  appearSeconds: 0.5,
  loopAt: 72,
  zoomStartNodes: 7,
  zoomStep: 0.02,
  zoomMin: 0.75,
};

export const MONO_FONT = [
  "var(--font-jetbrains-mono)",
  "ui-monospace",
  "SFMono-Regular",
  "Menlo",
  "monospace",
];

export const DEFAULT_NARRATION = "--";

export const RESOLVED_BUDGET_STATUSES = new Set<NodeStatus>([
  "succeeded",
  "failed",
  "expired",
  "rejected",
]);

export const BLOCKED_STATUSES = new Set<NodeStatus>(["failed", "rejected", "expired"]);

export const STAKE_NEEDS_COLOR = 0xe6edf3;
export const STAKE_ELIGIBLE_COLOR = 0x4fe3c2;
export const FUNDING_FILL_COLOR = 0x2aa676;

export const MECH_VARIANT_SUFFIXES = ["II", "III", "IV", "V"];
export const BUDGET_INFLOW_BIASES = [0.9, 1.2, 1.5, 2.0, 2.6];

export const FLOW_TASKS = [
  "Core operations stream",
  "Contributor stipends",
  "Research coordination",
  "Field team support",
  "Platform maintenance",
  "Outreach initiatives",
  "Quality assurance",
  "Partner integrations",
  "Data pipeline ops",
  "Community management",
  "Technical writing",
  "Regional coordinators",
  "Compliance monitoring",
  "Impact measurement",
  "Stakeholder comms",
  "Training programs",
  "Resource allocation",
  "Network expansion",
  "Process improvement",
  "Knowledge sharing",
];

export const ROUND_TASKS = [
  "Micro-grants round",
  "Innovation challenges",
  "Pilot project grants",
  "Contributor bounties",
  "Research proposals",
  "Community initiatives",
  "Local chapter grants",
  "Tooling improvements",
  "Outreach experiments",
  "Documentation bounties",
  "Advocacy grants",
  "Partnership proposals",
  "Education initiatives",
  "Rapid response fund",
  "Emerging opportunities",
  "Regional expansion",
  "Collaboration grants",
  "Impact accelerator",
  "Builder residencies",
  "Open calls",
];

export const PAYEE_NAME_PREFIXES = [
  "Core",
  "Field",
  "Ops",
  "Research",
  "Community",
  "Builder",
  "Policy",
  "Data",
  "Security",
  "Growth",
  "Infra",
  "Education",
];

export const PAYEE_NAME_SUFFIXES = [
  "Team",
  "Guild",
  "Collective",
  "Crew",
  "Lab",
  "Working Group",
  "Council",
  "Unit",
  "Circle",
  "Squad",
  "Ops",
  "Network",
];
