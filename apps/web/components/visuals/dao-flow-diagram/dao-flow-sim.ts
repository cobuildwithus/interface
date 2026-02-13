import type { ActorId, DaoEvent, NodeState, NodeType, SimState, StakePos } from "./dao-flow-types";
import { DEFAULT_NARRATION, PARAMS, RESOLVED_BUDGET_STATUSES } from "./dao-flow-params";
import {
  budgetInflowBias,
  formatUSD,
  isBlockedStatus,
  payeeCountForMech,
  sumStakes,
} from "./dao-flow-utils";

export function makeEmptySim(): SimState {
  return {
    now: 0,
    narration: DEFAULT_NARRATION,
    nodes: {},
    stakes: {},
    edges: [],
    createdOrder: [],
    autoMechSpawned: new Set(),
  };
}

export function ensureStakePos(sim: SimState, nodeId: string, actor: ActorId): StakePos {
  sim.stakes[nodeId] ??= {};
  sim.stakes[nodeId][actor] ??= { weight: 0, exposure: 0, conviction: 0 };
  return sim.stakes[nodeId][actor]!;
}

export function ensureNode(sim: SimState, node: Omit<NodeState, "inRate" | "outRate">) {
  if (!sim.nodes[node.id]) {
    sim.nodes[node.id] = { ...node, inRate: 0, outRate: 0 };
    sim.createdOrder.push(node.id);
  }
}

export function getPayeesForMech(sim: SimState, mechId: string) {
  return Object.values(sim.nodes).filter((n) => n.type === "payee" && n.parentId === mechId);
}

export function applyEvent(sim: SimState, ev: DaoEvent) {
  sim.narration = "";

  switch (ev.type) {
    case "GOAL_CREATE": {
      sim.goalId = ev.id;
      sim.goalDeadline = ev.deadline;

      ensureNode(sim, {
        id: ev.id,
        type: "goal",
        title: ev.title,
        createdAt: ev.t,
        status: "active",
        treasury: 0,
        spent: 0,
      });

      sim.narration = `Goal created: ${ev.title}`;
      break;
    }

    case "GOAL_DEPOSIT": {
      const goal = sim.goalId ? sim.nodes[sim.goalId] : undefined;
      if (!goal) break;

      goal.treasury += ev.amount;

      sim.narration = `Deposit ${formatUSD(ev.amount)}`;
      break;
    }

    case "NOTE": {
      sim.narration = ev.text;
      break;
    }

    case "BUDGET_PROPOSE": {
      if (!sim.goalId) break;
      ensureNode(sim, {
        id: ev.id,
        type: "budget",
        parentId: sim.goalId,
        title: ev.title,
        createdAt: ev.t,
        status: "proposed",
        treasury: 0,
        spent: 0,
        minBudget: ev.minBudget,
        maxBudget: ev.maxBudget,
        fundingDeadline: ev.fundingDeadline,
        executionDuration: ev.executionDuration,
      });

      sim.narration = `Subgoal proposed: ${ev.title}`;
      break;
    }

    case "BUDGET_TCR_RESOLVE": {
      const b = sim.nodes[ev.id];
      if (!b) break;
      const rejected = ev.result === "REJECTED";
      b.status = rejected ? "rejected" : "funding";
      if (rejected) {
        b.fadeOutAt = sim.now;
        b.fadeOutDuration = PARAMS.fadeOutSeconds;
        delete sim.stakes[b.id];
        removeDescendants(sim, b.id);
      }
      sim.narration =
        ev.result === "LISTED" ? `Subgoal listed: ${b.title}` : `Subgoal rejected: ${b.title}`;
      break;
    }

    case "MECH_PROPOSE": {
      const parent = sim.nodes[ev.parentBudgetId];
      if (!parent) break;
      if (parent.status === "rejected" || parent.status === "failed" || parent.status === "expired")
        break;
      if (parent.status === "proposed") break;
      const budgetEligible = parent.minBudget != null && parent.treasury >= parent.minBudget;
      if (!budgetEligible) break;

      ensureNode(sim, {
        id: ev.id,
        type: "mech",
        parentId: ev.parentBudgetId,
        title: ev.title,
        createdAt: ev.t,
        status: "proposed",
        mechType: ev.mechType,
        treasury: 0,
        spent: 0,
      });

      const explicitPayees = ev.payees?.length ?? 0;
      const targetPayees = Math.max(explicitPayees, payeeCountForMech(ev.id));
      for (let i = 0; i < targetPayees; i++) {
        ensureNode(sim, {
          id: `${ev.id}-p${i + 1}`,
          type: "payee",
          parentId: ev.id,
          title: "",
          createdAt: ev.t,
          status: "active",
          treasury: 0,
          spent: 0,
        });
      }

      const mechLabel = ev.mechType === "FLOW" ? "Flow" : "Round";
      sim.narration = `${mechLabel} proposed: ${ev.title}`;
      break;
    }

    case "MECH_TCR_RESOLVE": {
      const m = sim.nodes[ev.id];
      if (!m) break;
      m.status = ev.result === "LISTED" ? "listed" : "rejected";
      const mechLabel =
        m.mechType === "FLOW" ? "Flow" : m.mechType === "ROUND" ? "Round" : "Mechanism";
      sim.narration =
        ev.result === "LISTED"
          ? `${mechLabel} listed: ${m.title}`
          : `${mechLabel} rejected: ${m.title}`;
      break;
    }

    case "STAKE_WEIGHT_SET": {
      const node = sim.nodes[ev.nodeId];
      if (!node) break;
      if (isBlockedStatus(node.status)) break;

      const pos = ensureStakePos(sim, ev.nodeId, ev.actor);

      pos.weight = ev.weight;
      pos.exposure = Math.max(pos.exposure, ev.weight);

      const actorLabel = ev.actor === "system" ? "System" : "Agent";
      if (ev.weight <= 0) {
        sim.narration = `${actorLabel} removed stake on ${node.title}`;
      } else {
        sim.narration = `${actorLabel} staked on ${node.title}`;
      }
      break;
    }

    case "PAYEE_ADD": {
      const mech = sim.nodes[ev.mechId];
      if (!mech || mech.type !== "mech") break;
      const existingPayees = getPayeesForMech(sim, ev.mechId).length;
      const newId = `${ev.mechId}-padd-${existingPayees + 1}-${Math.floor(sim.now * 1000)}`;
      ensureNode(sim, {
        id: newId,
        type: "payee",
        parentId: ev.mechId,
        title: "",
        createdAt: sim.now,
        status: "active",
        treasury: 0,
        spent: 0,
      });
      sim.narration = `Recipient added to ${mech.title}`;
      break;
    }

    case "PAYEE_REMOVE": {
      const mech = sim.nodes[ev.mechId];
      if (!mech || mech.type !== "mech") break;
      const payees = getPayeesForMech(sim, ev.mechId);
      if (payees.length > 0) {
        const toRemove = payees[payees.length - 1];
        toRemove.fadeOutAt = sim.now;
        toRemove.fadeOutDuration = 0.5;
        sim.narration = `Recipient removed from ${mech.title}`;
      }
      break;
    }

    case "BUDGET_RESOLVE": {
      const b = sim.nodes[ev.id];
      const goal = sim.goalId ? sim.nodes[sim.goalId] : undefined;
      if (!b || !goal) break;

      const failed = ev.result === "FAILED";
      b.status = failed ? "failed" : "succeeded";
      if (failed) {
        b.failReason = ev.reason ?? "Failed";
        b.fadeOutAt = sim.now;
        b.fadeOutDuration = PARAMS.fadeOutSeconds;
        removeDescendants(sim, b.id);
      }

      goal.treasury += b.treasury;
      b.treasury = 0;

      for (const [nodeId, stakeMap] of Object.entries(sim.stakes)) {
        const n = sim.nodes[nodeId];
        if (!n) continue;
        const isInBudgetSubtree =
          nodeId === b.id ||
          n.parentId === b.id ||
          (n.parentId && sim.nodes[n.parentId]?.parentId === b.id);
        if (!isInBudgetSubtree) continue;

        for (const sp of Object.values(stakeMap)) {
          if (!sp) continue;
          sp.weight = 0;
          sp.exposure = 0;
        }
      }

      if (failed) {
        sim.narration = `Subgoal failed: ${b.title}${b.failReason ? ` - ${b.failReason}` : ""}`;
      } else {
        sim.narration = `Subgoal completed: ${b.title}`;
      }
      break;
    }

    case "GOAL_RESOLVE": {
      sim.goalResolved = ev.result;
      sim.narration = ev.result === "SUCCEEDED" ? "Goal completed." : "Goal failed.";
      break;
    }
  }

  if (sim.narration) {
    sim.lastEventType = ev.type;
    sim.lastEventOutcome = undefined;
    if (ev.type === "BUDGET_TCR_RESOLVE" || ev.type === "MECH_TCR_RESOLVE") {
      sim.lastEventOutcome = ev.result;
    }
    if (ev.type === "BUDGET_RESOLVE" || ev.type === "GOAL_RESOLVE") {
      sim.lastEventOutcome = ev.result;
    }
    if (ev.type === "STAKE_WEIGHT_SET") {
      sim.lastEventOutcome = ev.weight > 0 ? "STAKE_ADDED" : "STAKE_REMOVED";
    }
  }

  if (!sim.narration) sim.narration = DEFAULT_NARRATION;
}

export function buildChildrenIndex(nodes: Record<string, NodeState>) {
  const byParent: Record<string, string[]> = {};
  for (const n of Object.values(nodes)) {
    if (!n.parentId) continue;
    byParent[n.parentId] ??= [];
    byParent[n.parentId].push(n.id);
  }
  return byParent;
}

export function removeDescendants(sim: SimState, rootId: string) {
  const byParent = buildChildrenIndex(sim.nodes);
  const toRemove: string[] = [];
  const stack = [...(byParent[rootId] ?? [])];

  while (stack.length) {
    const id = stack.pop();
    if (!id) continue;
    toRemove.push(id);
    const children = byParent[id];
    if (children) stack.push(...children);
  }

  if (!toRemove.length) return;

  for (const id of toRemove) {
    delete sim.nodes[id];
    delete sim.stakes[id];
  }
  sim.createdOrder = sim.createdOrder.filter((id) => !toRemove.includes(id));
}

export function computeDepthMap(goalId: string | undefined, byParent: Record<string, string[]>) {
  const depth: Record<string, number> = {};
  if (!goalId) return depth;

  const queue: Array<{ id: string; d: number }> = [{ id: goalId, d: 0 }];
  depth[goalId] = 0;

  while (queue.length) {
    const current = queue.shift();
    if (!current) continue;
    const children = byParent[current.id] ?? [];
    for (const child of children) {
      depth[child] = current.d + 1;
      queue.push({ id: child, d: current.d + 1 });
    }
  }

  return depth;
}

export function computeStreamingAndEdges(sim: SimState, dt: number) {
  for (const n of Object.values(sim.nodes)) {
    n.inRate = 0;
    n.outRate = 0;
  }
  sim.edges = [];

  const goalId = sim.goalId;
  if (!goalId) return;
  const goal = sim.nodes[goalId];
  if (!goal || !sim.goalDeadline) return;

  for (const stakeMap of Object.values(sim.stakes)) {
    for (const sp of Object.values(stakeMap)) {
      if (!sp) continue;
      sp.conviction += sp.exposure * dt;
    }
  }

  function proRataRates(args: {
    parentId: string;
    parentOutflow: number;
    childIds: string[];
    minStake: number;
    maxRatePerStakeUnit: number;
    eligibility: (child: NodeState) => { eligible: boolean; capped: boolean };
    weightScale?: (child: NodeState) => number;
  }) {
    const {
      parentId,
      parentOutflow,
      childIds,
      minStake,
      maxRatePerStakeUnit,
      eligibility,
      weightScale,
    } = args;

    const eligibleInfo = childIds.map((cid) => {
      const child = sim.nodes[cid];
      const { eligible, capped } = eligibility(child);
      const rawWeight = sumStakes(sim.stakes[cid], "weight");
      const scale = weightScale?.(child) ?? 1;
      const allocWeight = rawWeight * scale;
      const ok = eligible && rawWeight >= minStake;
      return { cid, rawWeight, allocWeight, eligible: ok, capped };
    });

    const W = eligibleInfo.reduce((acc, x) => acc + (x.eligible ? x.allocWeight : 0), 0);

    if (W <= 0 || parentOutflow <= 0) {
      for (const x of eligibleInfo) {
        sim.edges.push({
          id: `${parentId}->${x.cid}`,
          from: parentId,
          to: x.cid,
          kind: "stream",
          rate: 0,
          eligible: x.eligible,
          capped: x.capped,
        });
      }
      return { totalOut: 0, rates: new Map<string, number>() };
    }

    const rates = new Map<string, number>();
    let totalOut = 0;

    for (const x of eligibleInfo) {
      if (!x.eligible) {
        rates.set(x.cid, 0);
        sim.edges.push({
          id: `${parentId}->${x.cid}`,
          from: parentId,
          to: x.cid,
          kind: "stream",
          rate: 0,
          eligible: false,
          capped: x.capped,
        });
        continue;
      }

      const rawRate = parentOutflow * (x.allocWeight / W);
      const capRate = maxRatePerStakeUnit * x.rawWeight;
      const finalRate = Math.min(rawRate, capRate);

      rates.set(x.cid, finalRate);
      totalOut += finalRate;

      sim.edges.push({
        id: `${parentId}->${x.cid}`,
        from: parentId,
        to: x.cid,
        kind: "stream",
        rate: finalRate,
        eligible: true,
        capped: rawRate > capRate + 1e-6,
      });
    }

    return { totalOut, rates };
  }

  const byParent = buildChildrenIndex(sim.nodes);
  const childrenOfType = (parentId: string, type: NodeType) =>
    (byParent[parentId] ?? []).filter((id) => sim.nodes[id]?.type === type);
  const budgetIds = childrenOfType(goalId, "budget");

  for (const bid of budgetIds) {
    const b = sim.nodes[bid];
    if (!b) continue;

    const isResolved = RESOLVED_BUDGET_STATUSES.has(b.status);

    if (
      !isResolved &&
      (b.status === "funding" || b.status === "proposed") &&
      b.minBudget != null &&
      b.treasury >= b.minBudget
    ) {
      b.activatedAt = sim.now;
      b.executionEndsAt = sim.now + (b.executionDuration ?? 0);
      b.status = "active";
    }

    if (
      !isResolved &&
      b.status !== "active" &&
      b.status !== "capped" &&
      b.fundingDeadline != null &&
      sim.now > b.fundingDeadline
    ) {
      b.status = "expired";
      b.fadeOutAt = sim.now;
      b.fadeOutDuration = PARAMS.fadeOutSeconds;
      delete sim.stakes[b.id];
      removeDescendants(sim, b.id);
      goal.treasury += b.treasury;
      b.treasury = 0;
    }

    if (!isResolved && b.maxBudget != null && b.treasury >= b.maxBudget) {
      if (b.status === "active") b.status = "capped";
      if (b.status === "funding") b.status = "capped";
    }
  }

  const timeRemainingGoal = Math.max(sim.goalDeadline - sim.now, 0);
  const R_goal = sim.goalResolved
    ? 0
    : timeRemainingGoal > 0
      ? goal.treasury / timeRemainingGoal
      : 0;

  const goalRates = proRataRates({
    parentId: goalId,
    parentOutflow: R_goal,
    childIds: budgetIds,
    minStake: PARAMS.minStakeBudget,
    maxRatePerStakeUnit: PARAMS.maxRatePerStakeUnitGoal,
    eligibility: (child) => {
      const listed =
        child.status !== "rejected" && child.status !== "proposed" && child.type === "budget";
      const resolved =
        child.status === "succeeded" || child.status === "failed" || child.status === "expired";
      const capped = child.maxBudget != null && child.treasury >= child.maxBudget;
      return { eligible: listed && !resolved && !capped, capped };
    },
    weightScale: (child) => budgetInflowBias(child.id),
  });

  const maxPossibleGoalOut = Math.min(goalRates.totalOut, goal.treasury / Math.max(dt, 1e-6));
  const goalScale = goalRates.totalOut > 0 ? maxPossibleGoalOut / goalRates.totalOut : 0;

  let goalOut = 0;
  for (const [cid, r] of goalRates.rates.entries()) {
    const rate = r * goalScale;
    if (rate <= 0) continue;

    const child = sim.nodes[cid];
    if (!child) continue;

    const amount = rate * dt;
    goal.treasury -= amount;
    child.treasury += amount;

    child.inRate += rate;
    goalOut += rate;
  }
  goal.outRate = goalOut;

  for (const bid of budgetIds) {
    const b = sim.nodes[bid];
    if (!b) continue;

    const budgetResolved = RESOLVED_BUDGET_STATUSES.has(b.status);
    const budgetReady = b.minBudget != null && b.treasury >= b.minBudget;
    const budgetActive =
      !budgetResolved && (b.status === "active" || b.status === "capped" || budgetReady);

    if (!budgetActive || budgetResolved) continue;

    const mechIds = childrenOfType(bid, "mech");

    const execEnds = b.executionEndsAt ?? 0;
    const timeRemainingExec = Math.max(execEnds - sim.now, 0);
    const R_budget = timeRemainingExec > 0 ? b.treasury / timeRemainingExec : 0;

    const mechRates = proRataRates({
      parentId: bid,
      parentOutflow: R_budget,
      childIds: mechIds,
      minStake: PARAMS.minStakeMech,
      maxRatePerStakeUnit: PARAMS.maxRatePerStakeUnitBudget,
      eligibility: (child) => {
        const listed = child.status === "listed";
        const resolved = child.status === "rejected";
        return { eligible: listed && !resolved, capped: false };
      },
    });

    const maxPossibleBudgetOut = Math.min(mechRates.totalOut, b.treasury / Math.max(dt, 1e-6));
    const budgetScale = mechRates.totalOut > 0 ? maxPossibleBudgetOut / mechRates.totalOut : 0;

    let budgetOut = 0;
    for (const [mid, r] of mechRates.rates.entries()) {
      const rate = r * budgetScale;
      if (rate <= 0) continue;

      const mech = sim.nodes[mid];
      if (!mech) continue;

      const amount = rate * dt;
      b.treasury -= amount;
      mech.spent += amount;
      mech.inRate += rate;
      b.outRate += rate;
      budgetOut += rate;

      const payeeIds = childrenOfType(mid, "payee");
      if (payeeIds.length > 0) {
        const each = rate / payeeIds.length;
        for (const pid of payeeIds) {
          const p = sim.nodes[pid];
          if (!p) continue;
          p.spent += each * dt;
          p.inRate += each;

          sim.edges.push({
            id: `${mid}->${pid}`,
            from: mid,
            to: pid,
            kind: "payout",
            rate: each,
            eligible: true,
            capped: false,
          });
        }
      }
    }
    b.outRate = budgetOut;
  }
}
