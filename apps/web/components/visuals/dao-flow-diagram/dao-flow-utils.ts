import type { ActorId, AutoMechTemplate, NodeStatus, NodeType, StakePos } from "./dao-flow-types";
import {
  BLOCKED_STATUSES,
  BUDGET_INFLOW_BIASES,
  FLOW_TASKS,
  MECH_VARIANT_SUFFIXES,
  PARAMS,
  PAYEE_NAME_PREFIXES,
  PAYEE_NAME_SUFFIXES,
  ROUND_TASKS,
} from "./dao-flow-params";

export function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function hashString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function payeeCountForMech(mechId: string, minCount = 1, maxCount = 3) {
  const span = Math.max(1, maxCount - minCount + 1);
  return minCount + (hashString(mechId) % span);
}

export function budgetInflowBias(budgetId: string) {
  return BUDGET_INFLOW_BIASES[hashString(budgetId) % BUDGET_INFLOW_BIASES.length] ?? 1;
}

export function buildMechTitle(
  budgetId: string,
  mechIndex: number,
  type: AutoMechTemplate["mechType"],
  customFlowTasks?: string[],
  customRoundTasks?: string[]
) {
  const seed = hashString(`${budgetId}-${mechIndex}-${type}`);
  const defaultTasks = type === "FLOW" ? FLOW_TASKS : ROUND_TASKS;
  const customTasks = type === "FLOW" ? customFlowTasks : customRoundTasks;
  const tasks = customTasks && customTasks.length > 0 ? customTasks : defaultTasks;
  const base = tasks[seed % tasks.length] ?? "Operational task";
  return base;
}

export function buildPayeeTitle(mechId: string, payeeIndex: number) {
  const seed = hashString(`${mechId}-payee-${payeeIndex}`);
  const prefix = PAYEE_NAME_PREFIXES[seed % PAYEE_NAME_PREFIXES.length] ?? "Core";
  const suffix = PAYEE_NAME_SUFFIXES[(seed >> 3) % PAYEE_NAME_SUFFIXES.length] ?? "Team";
  return `${prefix} ${suffix}`;
}

export function buildMechTemplates(templates: AutoMechTemplate[], count: number, seedKey: string) {
  if (templates.length === 0 || count <= 0) return [];
  const start = hashString(seedKey) % templates.length;
  const rotated = [...templates.slice(start), ...templates.slice(0, start)];
  const plan: AutoMechTemplate[] = [];

  for (let i = 0; i < count; i += 1) {
    const base = rotated[i % rotated.length];
    const cycle = Math.floor(i / rotated.length);
    if (cycle === 0) {
      plan.push({ ...base });
      continue;
    }
    const suffix = MECH_VARIANT_SUFFIXES[cycle - 1] ?? `${cycle + 1}`;
    plan.push({
      ...base,
      title: `${base.title} ${suffix}`,
      payees: base.payees?.map((payee) => ({ title: `${payee.title} ${suffix}` })),
    });
  }

  return plan;
}

export function formatUSD(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}m`;
  if (abs >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

export function sumStakes(
  map: Partial<Record<ActorId, StakePos>> | undefined,
  field: keyof StakePos
): number {
  if (!map) return 0;
  let s = 0;
  for (const v of Object.values(map)) if (v) s += v[field];
  return s;
}

export function statusColorHex(type: NodeType, status: NodeStatus) {
  const base = {
    goal: 0x78a6ff,
    budget: 0xe6edf3,
    mech: 0xc49bff,
    payee: 0x9aa4b2,
  }[type];

  if (status === "rejected") return 0xff5c73;
  if (status === "failed" || status === "expired") return 0xff7a7a;
  if (status === "succeeded") return 0x4fe3c2;
  if (status === "active") return 0x3ddc97;
  if (status === "capped") return 0xffc857;
  if (status === "proposed") return 0x6b7280;
  return base;
}

export function isBlockedStatus(status?: NodeStatus) {
  return !status || BLOCKED_STATUSES.has(status);
}

export function stakeThresholdForNode(type: NodeType) {
  if (type === "budget") return PARAMS.minStakeBudget;
  if (type === "mech") return PARAMS.minStakeMech;
  return 0;
}

export function nodeRadius(type: NodeType) {
  if (type === "goal") return 28;
  if (type === "budget") return 20;
  if (type === "mech") return 16;
  return 5;
}
