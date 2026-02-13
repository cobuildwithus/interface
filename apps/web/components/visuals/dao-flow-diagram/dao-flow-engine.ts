import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceRadial,
  forceSimulation,
  type Simulation,
  type SimulationNodeDatum,
} from "d3-force";
import type {
  ActorId,
  AutoMechTemplate,
  DaoEvent,
  EdgeKind,
  NodeState,
  NodeType,
} from "./dao-flow-types";
import { REPLACEMENT_BUDGET_TITLES } from "./dao-flow-data";
import {
  FUNDING_FILL_COLOR,
  MONO_FONT,
  PARAMS,
  STAKE_ELIGIBLE_COLOR,
  STAKE_NEEDS_COLOR,
} from "./dao-flow-params";
import {
  buildMechTemplates,
  buildMechTitle,
  buildPayeeTitle,
  clamp01,
  formatUSD,
  hashString,
  isBlockedStatus,
  lerp,
  nodeRadius,
  stakeThresholdForNode,
  statusColorHex,
  sumStakes,
} from "./dao-flow-utils";
import {
  applyEvent,
  buildChildrenIndex,
  computeDepthMap,
  computeStreamingAndEdges,
  makeEmptySim,
} from "./dao-flow-sim";

type LayoutPos = { x: number; y: number };

type ForceNode = SimulationNodeDatum & {
  id: string;
  type: NodeType;
  parentId?: string;
  depth: number;
  radius: number;
};

type ForceLink = {
  source: string | ForceNode;
  target: string | ForceNode;
};

export type DaoFlowDiagramOptions = {
  host: HTMLDivElement;
  events: DaoEvent[];
  autoMechTemplates?: AutoMechTemplate[];
  autoMechDelay?: number;
  replacementBudgetTitles?: string[];
  flowTasks?: string[];
  roundTasks?: string[];
};

export function startDaoFlowDiagram({
  host,
  events,
  autoMechTemplates,
  autoMechDelay = PARAMS.autoMechDelay,
  replacementBudgetTitles,
  flowTasks,
  roundTasks,
}: DaoFlowDiagramOptions) {
  if (!host) return () => undefined;

  let destroyed = false;
  let app: import("pixi.js").Application | null = null;
  const replacementTitles =
    replacementBudgetTitles && replacementBudgetTitles.length > 0
      ? replacementBudgetTitles
      : REPLACEMENT_BUDGET_TITLES;
  const customFlowTasks = flowTasks && flowTasks.length > 0 ? flowTasks : undefined;
  const customRoundTasks = roundTasks && roundTasks.length > 0 ? roundTasks : undefined;

  (async () => {
    const PIXI = await import("pixi.js");
    const {
      Application,
      Container,
      Graphics,
      Text,
      TextStyle,
      ParticleContainer,
      Particle,
      Rectangle,
    } = PIXI;

    if (destroyed) return;

    app = new Application();
    await app.init({
      resizeTo: host,
      backgroundColor: 0x000000,
      antialias: true,
      autoDensity: true,
      resolution: Math.max(1, Math.floor(window.devicePixelRatio || 1)),
    });
    if (destroyed) return;

    app.canvas.style.pointerEvents = "none";
    host.appendChild(app.canvas);

    const stage = app.stage;
    stage.sortableChildren = true;

    const worldLayer = new Container();
    worldLayer.sortableChildren = true;

    const edgesGfx = new Graphics();
    const beamGfx = new Graphics();
    beamGfx.blendMode = "add";
    const nodesLayer = new Container();
    const payeeNodesLayer = new Container(); // Renders behind main nodes
    const mainNodesLayer = new Container(); // Renders in front of payees
    nodesLayer.addChild(payeeNodesLayer);
    nodesLayer.addChild(mainNodesLayer);
    const agentLayer = new Container();
    const uiLayer = new Container();

    const particleLayer = new ParticleContainer({
      dynamicProperties: {
        position: true,
        rotation: false,
        vertex: false,
        color: true,
      },
    });
    particleLayer.boundsArea = new Rectangle(0, 0, app.renderer.width, app.renderer.height);

    edgesGfx.zIndex = 0;
    beamGfx.zIndex = 1;
    particleLayer.zIndex = 2;
    nodesLayer.zIndex = 10;
    agentLayer.zIndex = 50;
    worldLayer.zIndex = 0;
    uiLayer.zIndex = 100;

    worldLayer.addChild(edgesGfx);
    worldLayer.addChild(beamGfx);
    worldLayer.addChild(particleLayer);
    worldLayer.addChild(nodesLayer);
    worldLayer.addChild(agentLayer);

    stage.addChild(worldLayer);
    stage.addChild(uiLayer);

    const labelStyle = new TextStyle({
      fontFamily: MONO_FONT,
      fontSize: 12,
      fill: 0xe6edf3,
      lineHeight: 14,
    });

    const smallStyle = new TextStyle({
      fontFamily: MONO_FONT,
      fontSize: 11,
      fill: 0x9aa4b2,
      lineHeight: 13,
    });

    const dotTexture = (() => {
      const g = new Graphics().circle(0, 0, 2.5).fill({ color: 0xffffff, alpha: 1 });
      return app!.renderer.generateTexture({ target: g, resolution: 2 });
    })();

    type FlowParticle = {
      p: InstanceType<typeof Particle>;
      x0: number;
      y0: number;
      x1: number;
      y1: number;
      len: number;
      t: number;
      speed: number;
      alpha0: number;
    };

    const pool: FlowParticle[] = [];
    const activeParticles: FlowParticle[] = [];
    const spawnAcc: Record<string, number> = {};
    type BeamEndpoint =
      | { type: "point"; x: number; y: number }
      | { type: "actor"; id: ActorKey }
      | { type: "node"; id: string };

    const beams: Array<{
      from: BeamEndpoint;
      to: BeamEndpoint;
      ttl: number;
      max: number;
      color: number;
      phase: number;
    }> = [];

    function allocParticle(): FlowParticle {
      const fp = pool.pop();
      if (fp) return fp;

      const p = new Particle({
        texture: dotTexture,
        x: 0,
        y: 0,
        anchorX: 0.5,
        anchorY: 0.5,
        alpha: 0.8,
        tint: 0xffffff,
      });
      return {
        p,
        x0: 0,
        y0: 0,
        x1: 0,
        y1: 0,
        len: 1,
        t: 0,
        speed: PARAMS.flowPixelsPerSecond,
        alpha0: 0.8,
      };
    }

    function spawnAlongEdge(
      edgeId: string,
      x0: number,
      y0: number,
      x1: number,
      y1: number,
      rate: number,
      kind: EdgeKind,
      dt: number
    ) {
      let targetPps = (rate / 1000) * PARAMS.particlesPerSecondAt1000;
      if (kind === "payout") {
        targetPps = Math.max(
          PARAMS.payoutMinParticlesPerSecond,
          targetPps * PARAMS.payoutParticlesMultiplier
        );
      }
      const pps =
        kind === "payout"
          ? Math.min(PARAMS.payoutMaxParticlesPerSecond, targetPps)
          : Math.min(30, targetPps);
      spawnAcc[edgeId] = (spawnAcc[edgeId] ?? 0) + pps * dt;

      while (spawnAcc[edgeId] >= 1) {
        spawnAcc[edgeId] -= 1;

        const fp = allocParticle();
        fp.x0 = x0;
        fp.y0 = y0;
        fp.x1 = x1;
        fp.y1 = y1;
        fp.len = Math.max(1, Math.hypot(x1 - x0, y1 - y0));
        fp.t = 0;
        fp.speed =
          kind === "payout" ? PARAMS.flowPixelsPerSecond * 1.1 : PARAMS.flowPixelsPerSecond;
        fp.alpha0 = kind === "payout" ? 0.55 : 0.8;

        fp.p.alpha = fp.alpha0;
        fp.p.tint = kind === "payout" ? 0xb8c0cc : 0xffffff;

        fp.p.x = x0;
        fp.p.y = y0;

        particleLayer.addParticle(fp.p);
        activeParticles.push(fp);
      }
    }

    function beamBurst(from: BeamEndpoint, to: BeamEndpoint, color: number) {
      beams.push({ from, to, ttl: 0.8, max: 0.8, color, phase: Math.random() * Math.PI * 2 });
    }

    type NodeView = {
      root: InstanceType<typeof Container>;
      circle: InstanceType<typeof Graphics>;
      fill: InstanceType<typeof Graphics>;
      fundingFill: InstanceType<typeof Graphics>;
      mask: InstanceType<typeof Graphics>;
      label: InstanceType<typeof Text>;
      sub: InstanceType<typeof Text>;
      fillLevel: number;
      fundingLevel: number;
      wavePhase: number;
    };

    const nodeViews = new Map<string, NodeView>();

    function ensureNodeView(id: string, nodeType: NodeType): NodeView {
      const existing = nodeViews.get(id);
      if (existing) return existing;

      const root = new Container();
      const circle = new Graphics();
      const fill = new Graphics();
      const fundingFill = new Graphics();
      const mask = new Graphics();
      const label = new Text({ text: "", style: labelStyle });
      const sub = new Text({ text: "", style: smallStyle });

      label.anchor.set(0.5, 0);
      sub.anchor.set(0.5, 0);

      fill.mask = mask;
      fundingFill.mask = mask;

      root.addChild(fill);
      root.addChild(fundingFill);
      root.addChild(mask);
      root.addChild(circle);
      root.addChild(label);
      root.addChild(sub);

      // Payees render behind other nodes so their circles don't cover mech titles
      const targetLayer = nodeType === "payee" ? payeeNodesLayer : mainNodesLayer;
      targetLayer.addChild(root);

      const view: NodeView = {
        root,
        circle,
        fill,
        fundingFill,
        mask,
        label,
        sub,
        fillLevel: 0,
        fundingLevel: 0,
        wavePhase: Math.random() * Math.PI * 2,
      };
      nodeViews.set(id, view);
      return view;
    }

    const actors: Record<
      Exclude<ActorId, "system">,
      {
        x: number;
        y: number;
        vx: number;
        vy: number;
        baseX: number;
        baseY: number;
        targetX: number;
        targetY: number;
        holdUntil: number;
        nextWanderAt: number;
        wasInMotion: boolean;
        intentKey?: string;
        intentUntil?: number;
        intentNodeId?: string;
        intentPoint?: { x: number; y: number };
        lastAnchorNodeId?: string;
        lastAnchorPoint?: { x: number; y: number };
        orbitPhase: number;
        idlePhase: number;
        label: string;
        tint: number;
      }
    > = {
      human1: {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        baseX: 0,
        baseY: 0,
        targetX: 0,
        targetY: 0,
        holdUntil: 0,
        nextWanderAt: 0,
        wasInMotion: false,
        intentKey: undefined,
        intentUntil: undefined,
        intentNodeId: undefined,
        intentPoint: undefined,
        lastAnchorNodeId: undefined,
        lastAnchorPoint: undefined,
        orbitPhase: Math.random() * Math.PI * 2,
        idlePhase: Math.random() * Math.PI * 2,
        label: "Agent",
        tint: 0x78a6ff,
      },
      human2: {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        baseX: 0,
        baseY: 0,
        targetX: 0,
        targetY: 0,
        holdUntil: 0,
        nextWanderAt: 0,
        wasInMotion: false,
        intentKey: undefined,
        intentUntil: undefined,
        intentNodeId: undefined,
        intentPoint: undefined,
        lastAnchorNodeId: undefined,
        lastAnchorPoint: undefined,
        orbitPhase: Math.random() * Math.PI * 2,
        idlePhase: Math.random() * Math.PI * 2,
        label: "Agent",
        tint: 0x4fe3c2,
      },
      bot1: {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        baseX: 0,
        baseY: 0,
        targetX: 0,
        targetY: 0,
        holdUntil: 0,
        nextWanderAt: 0,
        wasInMotion: false,
        intentKey: undefined,
        intentUntil: undefined,
        intentNodeId: undefined,
        intentPoint: undefined,
        lastAnchorNodeId: undefined,
        lastAnchorPoint: undefined,
        orbitPhase: Math.random() * Math.PI * 2,
        idlePhase: Math.random() * Math.PI * 2,
        label: "Agent",
        tint: 0xffd66e,
      },
    };
    type ActorKey = keyof typeof actors;
    const actorIds = Object.keys(actors) as ActorKey[];
    const stakeActorIds = actorIds;

    const actorViews = new Map<
      string,
      {
        root: InstanceType<typeof Container>;
        dot: InstanceType<typeof Graphics>;
        txt: InstanceType<typeof Text>;
        name: InstanceType<typeof Text>;
      }
    >();

    function drawAgentAvatar(g: InstanceType<typeof Graphics>, color: number) {
      g.clear();
      g.roundRect(-10, -14, 20, 16, 6).fill({ color, alpha: 0.22 });
      g.roundRect(-10, -14, 20, 16, 6).stroke({ width: 1, color, alpha: 0.6 });
      g.roundRect(-12, 4, 24, 14, 6).fill({ color, alpha: 0.16 });
      g.roundRect(-12, 4, 24, 14, 6).stroke({ width: 1, color, alpha: 0.5 });
      g.circle(0, -20, 2.2).fill({ color, alpha: 0.6 });
    }

    function pickEdgePoint(width: number, height: number) {
      const pad = 22;
      const edge = Math.floor(Math.random() * 4);
      if (edge === 0) return { x: pad + Math.random() * (width - pad * 2), y: pad };
      if (edge === 1) return { x: width - pad, y: pad + Math.random() * (height - pad * 2) };
      if (edge === 2) return { x: pad + Math.random() * (width - pad * 2), y: height - pad };
      return { x: pad, y: pad + Math.random() * (height - pad * 2) };
    }

    function layoutActors(width: number, height: number) {
      actorIds.forEach((actorId) => {
        const actor = actors[actorId];
        const edge = pickEdgePoint(width, height);
        actor.baseX = edge.x;
        actor.baseY = edge.y;
        actor.nextWanderAt = Math.random() * 4 + 2;
        if (actor.holdUntil <= 0) {
          actor.x = actor.baseX;
          actor.y = actor.baseY;
          actor.vx = 0;
          actor.vy = 0;
        }
      });
    }

    function ensureActorView(id: ActorKey) {
      const existing = actorViews.get(id);
      if (existing) return existing;

      const root = new Container();
      const dot = new Graphics();
      const txt = new Text({ text: "", style: labelStyle });
      txt.anchor.set(0.5, 0.5);
      const name = new Text({ text: actors[id].label, style: smallStyle });
      name.anchor.set(0.5, 0);

      root.addChild(dot);
      root.addChild(txt);
      root.addChild(name);
      agentLayer.addChild(root);

      const view = { root, dot, txt, name };
      actorViews.set(id, view);
      return view;
    }

    let sim = makeEmptySim();
    let eventIndex = 0;
    let pendingEvents: DaoEvent[] = [];
    let timeline = [...events].sort((a, b) => a.t - b.t);
    let replacementCounter = 0;
    let autoPayeeTargets = new Map<string, number>();

    let lastLayoutKey = "";
    let lastSizeKey = "";
    let positions: Record<string, LayoutPos> = {};
    let worldScale = 1;

    let forceNodes: ForceNode[] = [];
    let forceNodesById = new Map<string, ForceNode>();
    let forceLinks: ForceLink[] = [];
    let simulation: Simulation<ForceNode, ForceLink> | null = null;

    const linkForce = forceLink<ForceNode, ForceLink>([])
      .id((d) => d.id)
      .distance((link) => {
        const targetId = typeof link.target === "string" ? link.target : link.target.id;
        const target = sim.nodes[targetId];
        if (!target) return 160;
        if (target.type === "budget") return 280;
        if (target.type === "mech") return 120;
        if (target.type === "payee") return 80;
        return 180;
      })
      .strength((link) => {
        const targetId = typeof link.target === "string" ? link.target : link.target.id;
        const target = sim.nodes[targetId];
        if (!target) return 0.18;
        if (target.type === "budget") return 0.2;
        if (target.type === "mech") return 0.35;
        if (target.type === "payee") return 0.5;
        return 0.22;
      });

    const chargeForce = forceManyBody<ForceNode>().strength(-360).distanceMax(520);
    const collideForce = forceCollide<ForceNode>()
      .radius((n) => n.radius + 10)
      .strength(0.7);
    const centerForce = forceCenter();
    const radialForce = forceRadial<ForceNode>(0, 0, 0).strength(0.04);

    const shake = {
      timeLeft: 0,
      duration: 0,
      intensity: 0,
    };

    function triggerShake(intensity: number, duration: number) {
      if (intensity > shake.intensity) shake.intensity = intensity;
      if (duration > shake.duration) shake.duration = duration;
      shake.timeLeft = Math.max(shake.timeLeft, duration);
    }

    function getShakeOffset(now: number, dt: number) {
      if (shake.timeLeft <= 0) return { x: 0, y: 0 };
      shake.timeLeft = Math.max(0, shake.timeLeft - dt);
      const t = shake.duration > 0 ? shake.timeLeft / shake.duration : 0;
      const amp = shake.intensity * t;
      const x = Math.sin(now * 28) * amp;
      const y = Math.cos(now * 23) * amp;
      if (shake.timeLeft <= 0) shake.intensity = 0;
      return { x, y };
    }

    function resetSim() {
      sim = makeEmptySim();
      eventIndex = 0;
      pendingEvents = [];
      timeline = [...events].sort((a, b) => a.t - b.t);
      replacementCounter = 0;
      autoPayeeTargets = new Map();
      lastLayoutKey = "";
      positions = {};
      forceNodes = [];
      forceNodesById = new Map();
      forceLinks = [];
    }

    function insertEvent(ev: DaoEvent) {
      timeline.push(ev);
      timeline.sort((a, b) => a.t - b.t);
    }

    function collectFutureMechProposals(parentBudgetId: string) {
      let count = 0;
      const titles = new Set<string>();
      const ids = new Set<string>();
      for (let i = eventIndex; i < timeline.length; i++) {
        const ev = timeline[i];
        if (ev.t < sim.now) continue;
        if (ev.type !== "MECH_PROPOSE") continue;
        if (ev.parentBudgetId !== parentBudgetId) continue;
        count += 1;
        titles.add(ev.title);
        ids.add(ev.id);
      }
      return { count, titles, ids };
    }

    function collectFuturePayeeAdds(mechId: string) {
      let count = 0;
      for (let i = eventIndex; i < timeline.length; i++) {
        const ev = timeline[i];
        if (ev.t < sim.now) continue;
        if (ev.type !== "PAYEE_ADD") continue;
        if (ev.mechId !== mechId) continue;
        count += 1;
      }
      return count;
    }

    function autoSpawnMechs() {
      if (!autoMechTemplates || autoMechTemplates.length === 0) return;

      const byParent = buildChildrenIndex(sim.nodes);
      const delay = Math.max(0, autoMechDelay);
      for (const n of Object.values(sim.nodes)) {
        if (n.type !== "budget") continue;
        if (n.status === "proposed") continue;
        if (isBlockedStatus(n.status)) continue;
        if (sim.autoMechSpawned.has(n.id)) continue;

        const mechPlanCount = 1 + (hashString(`${n.id}-mech-count`) % 4);
        const existingMechIds = (byParent[n.id] ?? []).filter(
          (id) => sim.nodes[id]?.type === "mech"
        );
        const existingMechTitles = new Set(
          existingMechIds
            .map((id) => sim.nodes[id]?.title)
            .filter((title): title is string => Boolean(title))
        );
        const futureProposals = collectFutureMechProposals(n.id);
        const plannedCount = existingMechIds.length + futureProposals.count;

        if (plannedCount >= mechPlanCount) {
          sim.autoMechSpawned.add(n.id);
          continue;
        }

        const hasBudget = n.minBudget != null && n.treasury >= n.minBudget;
        if (!hasBudget) continue;

        const baseTime = sim.now + delay;
        const templatePlan = buildMechTemplates(autoMechTemplates, mechPlanCount, n.id);
        const plannedTitles = new Set<string>([...existingMechTitles, ...futureProposals.titles]);
        const needed = Math.max(0, mechPlanCount - plannedCount);
        const toSpawn = templatePlan
          .filter((tmpl) => !plannedTitles.has(tmpl.title))
          .slice(0, needed);
        const usedIds = new Set<string>([...existingMechIds, ...futureProposals.ids]);
        let autoIndex = 1;

        toSpawn.forEach((tmpl, idx) => {
          while (usedIds.has(`am-${n.id}-${autoIndex}`)) autoIndex += 1;
          const mechId = `am-${n.id}-${autoIndex}`;
          usedIds.add(mechId);
          const payees = tmpl.payees?.length ? tmpl.payees : [{ title: "Primary payee" }];
          const proposeAt = baseTime + idx * 0.6;
          const stakeAt = proposeAt + 1.4;
          const weight = PARAMS.minStakeMech + 6 + (idx % 2) * 3;
          const stakeSeed = hashString(`${n.id}-${idx}-${tmpl.mechType}`);
          const stakeActor = stakeActorIds[stakeSeed % stakeActorIds.length] ?? "human1";

          insertEvent({
            t: proposeAt,
            type: "MECH_PROPOSE",
            id: mechId,
            parentBudgetId: n.id,
            mechType: tmpl.mechType,
            title: buildMechTitle(
              n.id,
              autoIndex - 1,
              tmpl.mechType,
              customFlowTasks,
              customRoundTasks
            ),
            payees: payees.map((payee, payeeIndex) => ({
              id: `ap-${n.id}-${idx + 1}-${payeeIndex + 1}`,
              title: buildPayeeTitle(mechId, payeeIndex),
            })),
            by: "system",
          });

          insertEvent({
            t: proposeAt + 1,
            type: "MECH_TCR_RESOLVE",
            id: mechId,
            result: "LISTED",
          });

          insertEvent({
            t: stakeAt,
            type: "STAKE_WEIGHT_SET",
            nodeId: mechId,
            actor: stakeActor,
            weight,
          });
        });
        if (plannedCount + toSpawn.length >= mechPlanCount) {
          sim.autoMechSpawned.add(n.id);
        }
      }
    }

    function autoSpawnPayees() {
      const byParent = buildChildrenIndex(sim.nodes);
      const delay = Math.max(0.6, PARAMS.autoPayeeDelay);

      for (const n of Object.values(sim.nodes)) {
        if (n.type !== "mech") continue;
        if (isBlockedStatus(n.status) || n.status !== "listed") continue;

        const payeeIds = (byParent[n.id] ?? []).filter((id) => sim.nodes[id]?.type === "payee");
        const currentCount = payeeIds.length;
        const futureAdds = collectFuturePayeeAdds(n.id);

        let target = autoPayeeTargets.get(n.id);
        if (target == null) {
          const extra = 6 + (hashString(`${n.id}-payee-extra`) % 10);
          target = currentCount + extra;
          autoPayeeTargets.set(n.id, target);
        }

        const plannedCount = currentCount + futureAdds;
        if (plannedCount >= target) continue;

        const needed = target - plannedCount;
        const baseTime = sim.now + delay;
        for (let i = 0; i < needed; i += 1) {
          const seed = hashString(`${n.id}-payee-${plannedCount + i}`);
          const actor = stakeActorIds[seed % stakeActorIds.length] ?? "human1";
          insertEvent({
            t: baseTime + i * 0.7,
            type: "PAYEE_ADD",
            mechId: n.id,
            actor,
          });
        }
      }
    }

    function scheduleReplacementBudget(now: number) {
      const proposeAt = now + PARAMS.replacementDelay;
      if (proposeAt > PARAMS.loopAt - 2) return;

      const id = `br${replacementCounter + 1}`;
      const title = replacementTitles[replacementCounter % replacementTitles.length];
      const minBudget = 0;
      const maxBudget = 12_000;
      replacementCounter += 1;

      insertEvent({
        t: proposeAt,
        type: "BUDGET_PROPOSE",
        id,
        title,
        minBudget,
        maxBudget,
        fundingDeadline: Math.round(proposeAt + 40),
        executionDuration: 20,
        by: "system",
      });

      insertEvent({
        t: proposeAt + 1,
        type: "BUDGET_TCR_RESOLVE",
        id,
        result: "LISTED",
      });
    }

    function structuralKey(simState: { nodes: Record<string, NodeState> }) {
      const parts = Object.values(simState.nodes)
        .map((n) => `${n.id}|${n.parentId ?? ""}|${n.type}`)
        .sort();
      return parts.join("~");
    }

    function updateForceLayout() {
      const renderer = app!.renderer;
      const centerX = renderer.width * 0.5;
      const centerY = renderer.height * 0.5;

      const byParent = buildChildrenIndex(sim.nodes);
      const depthMap = computeDepthMap(sim.goalId, byParent);
      const nextNodes: ForceNode[] = [];
      const nextById = new Map<string, ForceNode>();

      const randomJitter = () => (Math.random() - 0.5) * 160;

      for (const n of Object.values(sim.nodes)) {
        if (n.type === "payee") continue;
        const prev = forceNodesById.get(n.id);
        const parent = n.parentId ? forceNodesById.get(n.parentId) : undefined;
        const radius = nodeRadius(n.type) + 6;

        const x = prev?.x ?? (parent?.x ?? centerX) + randomJitter();
        const y = prev?.y ?? (parent?.y ?? centerY) + randomJitter();
        const node: ForceNode = {
          id: n.id,
          type: n.type,
          parentId: n.parentId,
          depth: depthMap[n.id] ?? 0,
          radius,
          x,
          y,
          vx: prev?.vx ?? 0,
          vy: prev?.vy ?? 0,
        };

        if (sim.goalId && n.id === sim.goalId) {
          node.fx = centerX;
          node.fy = centerY;
          node.x = centerX;
          node.y = centerY;
        }

        nextNodes.push(node);
        nextById.set(n.id, node);
      }

      const nextLinks: ForceLink[] = [];
      for (const n of Object.values(sim.nodes)) {
        if (!n.parentId) continue;
        if (n.type === "payee") continue;
        if (!nextById.has(n.parentId)) continue;
        nextLinks.push({ source: n.parentId, target: n.id });
      }

      forceNodes = nextNodes;
      forceNodesById = nextById;
      forceLinks = nextLinks;

      radialForce.radius((node) => {
        if (node.depth <= 0) return 0;
        const base = 210 + (node.depth - 1) * 100;
        if (node.depth === 1) return base;
        const jitter = (hashString(node.id) % 120) - 60;
        return base + jitter;
      });

      centerForce.x(centerX).y(centerY);
      radialForce.x(centerX).y(centerY);

      if (!simulation) {
        simulation = forceSimulation(forceNodes)
          .force("link", linkForce)
          .force("charge", chargeForce)
          .force("collide", collideForce)
          .force("center", centerForce)
          .force("radial", radialForce)
          .alpha(1)
          .alphaDecay(0.04)
          .velocityDecay(0.3)
          .stop();
      } else {
        simulation.nodes(forceNodes);
      }

      linkForce.links(forceLinks);
      simulation.alpha(0.9);
      simulation.alphaTarget(0.03);
    }

    function applyBounds(nodes: ForceNode[]) {
      const width = app!.renderer.width;
      const height = app!.renderer.height;
      const pad = 70;
      for (const n of nodes) {
        if (n.fx != null || n.fy != null) continue;
        if (n.x == null || n.y == null) continue;
        if (n.x < pad) n.vx = (n.vx ?? 0) + (pad - n.x) * 0.01;
        if (n.x > width - pad) n.vx = (n.vx ?? 0) - (n.x - (width - pad)) * 0.01;
        if (n.y < pad) n.vy = (n.vy ?? 0) + (pad - n.y) * 0.01;
        if (n.y > height - pad) n.vy = (n.vy ?? 0) - (n.y - (height - pad)) * 0.01;
      }
    }

    function stepForces(dt: number) {
      if (!simulation) return;
      const steps = Math.max(1, Math.round(dt * 60));
      for (let i = 0; i < steps; i++) {
        simulation.tick();
        applyBounds(forceNodes);
      }
    }

    function updatePositions(now: number, dt: number) {
      const shakeOffset = getShakeOffset(now, dt);
      positions = {};
      for (const n of forceNodes) {
        if (n.x == null || n.y == null) continue;
        positions[n.id] = {
          x: n.x + shakeOffset.x,
          y: n.y + shakeOffset.y,
        };
      }

      const byParent = buildChildrenIndex(sim.nodes);
      for (const n of Object.values(sim.nodes)) {
        if (n.type !== "mech") continue;
        const center = positions[n.id];
        if (!center) continue;
        const payees = (byParent[n.id] ?? [])
          .filter((id) => sim.nodes[id]?.type === "payee")
          .sort();
        if (payees.length === 0) continue;
        const payeeRadius = nodeRadius("payee");
        const minSpacing = Math.max(10, payeeRadius * 2 - 2);
        const baseRadius = nodeRadius("mech") + minSpacing * 0.7;
        const ringGap = minSpacing * 0.7;
        const phase = (hashString(n.id) % 360) * (Math.PI / 180);
        const ringCount = Math.max(1, Math.ceil(payees.length / 12));
        const ringSizes: number[] = [];
        let remaining = payees.length;
        const payeeCenter = { x: center.x, y: center.y };

        for (let i = 0; i < ringCount; i++) {
          const size = Math.ceil(remaining / (ringCount - i));
          ringSizes.push(size);
          remaining -= size;
        }

        let cursor = 0;
        ringSizes.forEach((size, ringIndex) => {
          if (size <= 0) return;
          const minRadius = (size * minSpacing) / (Math.PI * 2);
          const radius = Math.max(baseRadius + ringIndex * ringGap, minRadius);
          const step = (Math.PI * 2) / size;
          const ringPhase = phase + (ringIndex * step) / 2;
          for (let i = 0; i < size; i++) {
            const angle = ringPhase + i * step;
            const id = payees[cursor + i];
            if (!id) continue;
            positions[id] = {
              x: payeeCenter.x + Math.cos(angle) * radius,
              y: payeeCenter.y + Math.sin(angle) * radius,
            };
          }
          cursor += size;
        });
      }
    }

    while (eventIndex < events.length && events[eventIndex].t <= 0) {
      applyEvent(sim, events[eventIndex]);
      eventIndex++;
    }

    layoutActors(app.renderer.width, app.renderer.height);
    for (const a of actorIds) ensureActorView(a);

    function updateActorViews() {
      for (const a of actorIds) {
        const v = ensureActorView(a);
        const conf = actors[a];

        v.root.x = conf.x;
        v.root.y = conf.y;

        drawAgentAvatar(v.dot, conf.tint);

        v.txt.text = "";
        v.txt.x = 0;
        v.txt.y = 0;

        v.name.text = conf.label;
        v.name.x = 0;
        v.name.y = 26;
      }
    }

    function updateActorPositions(now: number, dt: number) {
      function getUpcomingIntent(actorId: ActorKey) {
        for (let i = eventIndex; i < timeline.length; i++) {
          const ev = timeline[i];
          if (ev.t < now) continue;
          if (ev.t - now > PARAMS.agentActionLead) break;

          if (ev.type === "STAKE_WEIGHT_SET" && ev.actor === actorId && ev.weight > 0) {
            const node = sim.nodes[ev.nodeId];
            if (!node) continue;
            if (isBlockedStatus(node.status)) continue;
            return {
              key: `${ev.type}:${ev.nodeId}:${ev.t}`,
              until: ev.t + PARAMS.agentActionHold,
              nodeId: ev.nodeId,
            };
          }

          if (ev.type === "MECH_PROPOSE" && ev.by === actorId) {
            const parent = sim.nodes[ev.parentBudgetId];
            if (!parent) continue;
            return {
              key: `${ev.type}:${ev.id}:${ev.t}`,
              until: ev.t + PARAMS.agentActionHold,
              nodeId: ev.parentBudgetId,
            };
          }

          if (ev.type === "BUDGET_PROPOSE" && ev.by === actorId) {
            if (sim.goalId && sim.nodes[sim.goalId]) {
              return {
                key: `${ev.type}:${ev.id}:${ev.t}`,
                until: ev.t + PARAMS.agentActionHold,
                nodeId: sim.goalId,
              };
            }
            return {
              key: `${ev.type}:${ev.id}:${ev.t}`,
              until: ev.t + PARAMS.agentActionHold,
              point: getGoalCenterPoint(),
            };
          }

          if (ev.type === "PAYEE_ADD" && ev.actor === actorId) {
            if (positions[ev.mechId]) {
              return {
                key: `${ev.type}:${ev.mechId}:${ev.t}`,
                until: ev.t + PARAMS.agentActionHold,
                nodeId: ev.mechId,
              };
            }
          }

          if (ev.type === "GOAL_CREATE" && ev.by === actorId) {
            return {
              key: `${ev.type}:${ev.id}:${ev.t}`,
              until: ev.t + PARAMS.agentActionHold,
              point: getGoalCenterPoint(),
            };
          }
        }
        return null;
      }

      for (const a of actorIds) {
        const conf = actors[a];
        const intent = getUpcomingIntent(a);
        if (intent && conf.intentKey !== intent.key) {
          conf.intentKey = intent.key;
          conf.intentUntil = intent.until;
          conf.intentNodeId = intent.nodeId;
          conf.intentPoint = intent.point;
          conf.nextWanderAt = intent.until + 2 + Math.random() * 4;
        }
        const intentActive = conf.intentUntil != null && now < conf.intentUntil;
        const anchor = conf.intentNodeId
          ? (positions[conf.intentNodeId] ?? conf.intentPoint)
          : conf.intentPoint;

        if (intentActive && anchor) {
          conf.holdUntil = Math.max(conf.holdUntil, conf.intentUntil ?? now);
          conf.lastAnchorNodeId = conf.intentNodeId;
          conf.lastAnchorPoint = anchor;
        }

        const inMotion = now < conf.holdUntil;
        if (!inMotion && conf.wasInMotion) {
          conf.nextWanderAt = now + 2 + Math.random() * 4;
          conf.wasInMotion = false;
        }

        if (!intentActive) {
          if (conf.lastAnchorNodeId && positions[conf.lastAnchorNodeId]) {
            const lastAnchor = positions[conf.lastAnchorNodeId];
            conf.baseX = lastAnchor.x;
            conf.baseY = lastAnchor.y;
          } else if (conf.lastAnchorPoint) {
            conf.baseX = conf.lastAnchorPoint.x;
            conf.baseY = conf.lastAnchorPoint.y;
          } else if (now > conf.nextWanderAt) {
            const nextEdge = pickEdgePoint(app!.renderer.width, app!.renderer.height);
            conf.baseX = nextEdge.x;
            conf.baseY = nextEdge.y;
            conf.nextWanderAt = now + 10 + Math.random() * 10;
          }
        }

        let target: { x: number; y: number } | null = null;
        if (intentActive && anchor) {
          const phase = conf.orbitPhase + now * PARAMS.agentOrbitSpeed;
          target = {
            x: anchor.x + Math.cos(phase) * PARAMS.agentOrbitRadius,
            y: anchor.y + Math.sin(phase) * PARAMS.agentOrbitRadius,
          };
        } else {
          const phase = conf.idlePhase + now * PARAMS.agentIdleOrbitSpeed;
          target = {
            x: conf.baseX + Math.cos(phase) * PARAMS.agentIdleOrbitRadius,
            y: conf.baseY + Math.sin(phase) * PARAMS.agentIdleOrbitRadius,
          };
        }

        let ax = 0;
        let ay = 0;

        if (target) {
          const dx = target.x - conf.x;
          const dy = target.y - conf.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 0.001) {
            const desiredSpeed =
              dist < PARAMS.agentArriveRadius
                ? PARAMS.agentMaxSpeed * (dist / PARAMS.agentArriveRadius)
                : PARAMS.agentMaxSpeed;
            const desiredVx = (dx / dist) * desiredSpeed;
            const desiredVy = (dy / dist) * desiredSpeed;
            ax += (desiredVx - conf.vx) * PARAMS.agentSteerStrength;
            ay += (desiredVy - conf.vy) * PARAMS.agentSteerStrength;
          }
        }

        const personalSpace = intentActive
          ? PARAMS.agentPersonalSpaceBusy
          : PARAMS.agentPersonalSpaceBase;
        for (const otherId of actorIds) {
          if (otherId === a) continue;
          const other = actors[otherId];
          const odx = conf.x - other.x;
          const ody = conf.y - other.y;
          const dist = Math.hypot(odx, ody);
          if (dist <= 0.001) continue;
          const otherBusy = other.intentUntil != null && now < other.intentUntil;
          const otherSpace = otherBusy
            ? PARAMS.agentPersonalSpaceBusy
            : PARAMS.agentPersonalSpaceBase;
          const space = (personalSpace + otherSpace) * 0.5;
          if (dist < space) {
            const push = (1 - dist / space) * PARAMS.agentMaxAccel;
            ax += (odx / dist) * push;
            ay += (ody / dist) * push;
          }
        }

        const width = app!.renderer.width;
        const height = app!.renderer.height;
        const margin = 28;
        if (conf.x < margin) ax += (margin - conf.x) * PARAMS.agentBoundaryForce;
        if (conf.x > width - margin) ax -= (conf.x - (width - margin)) * PARAMS.agentBoundaryForce;
        if (conf.y < margin) ay += (margin - conf.y) * PARAMS.agentBoundaryForce;
        if (conf.y > height - margin)
          ay -= (conf.y - (height - margin)) * PARAMS.agentBoundaryForce;

        const accelMag = Math.hypot(ax, ay);
        if (accelMag > PARAMS.agentMaxAccel) {
          const scale = PARAMS.agentMaxAccel / accelMag;
          ax *= scale;
          ay *= scale;
        }

        conf.vx += ax * dt;
        conf.vy += ay * dt;

        const speed = Math.hypot(conf.vx, conf.vy);
        if (speed > PARAMS.agentMaxSpeed) {
          const scale = PARAMS.agentMaxSpeed / speed;
          conf.vx *= scale;
          conf.vy *= scale;
        }

        const friction = Math.pow(PARAMS.agentFriction, dt * 60);
        conf.vx *= friction;
        conf.vy *= friction;

        conf.x += conf.vx * dt;
        conf.y += conf.vy * dt;
        if (inMotion) conf.wasInMotion = true;
      }
    }

    function updateLayoutIfNeeded() {
      const renderer = app!.renderer;
      const sizeKey = `${renderer.width}x${renderer.height}`;
      const key = structuralKey(sim) + `|${sizeKey}`;
      if (key !== lastLayoutKey) {
        lastLayoutKey = key;
        updateForceLayout();
        particleLayer.boundsArea = new Rectangle(0, 0, renderer.width, renderer.height);
      }

      if (sizeKey !== lastSizeKey) {
        lastSizeKey = sizeKey;
        layoutActors(renderer.width, renderer.height);
      }

      const nodeCount = Object.keys(sim.nodes).length;
      const zoomTarget =
        nodeCount <= PARAMS.zoomStartNodes
          ? 1
          : Math.max(PARAMS.zoomMin, 1 - (nodeCount - PARAMS.zoomStartNodes) * PARAMS.zoomStep);
      worldScale = lerp(worldScale, zoomTarget, 0.08);
      const centerX = renderer.width * 0.5;
      const centerY = renderer.height * 0.5;
      worldLayer.pivot.set(centerX, centerY);
      worldLayer.position.set(centerX, centerY);
      worldLayer.scale.set(worldScale);
    }

    function pruneFadedBudgets() {
      const removals: string[] = [];
      for (const n of Object.values(sim.nodes)) {
        if (n.type !== "budget") continue;
        if (!isBlockedStatus(n.status)) continue;
        if (n.fadeOutAt == null || n.fadeOutDuration == null) continue;
        if (sim.now - n.fadeOutAt < n.fadeOutDuration) continue;
        removals.push(n.id);
      }

      if (removals.length === 0) return;
      for (const id of removals) {
        delete sim.nodes[id];
        delete sim.stakes[id];
        sim.createdOrder = sim.createdOrder.filter((entry) => entry !== id);
        scheduleReplacementBudget(sim.now);
      }
    }

    function updateNodeViews() {
      const now = sim.now;

      for (const [id, view] of nodeViews) {
        if (!sim.nodes[id]) {
          view.root.parent?.removeChild(view.root);
          view.root.destroy({ children: true });
          nodeViews.delete(id);
        }
      }

      for (const n of Object.values(sim.nodes)) {
        const pos = positions[n.id];
        if (!pos) continue;

        const view = ensureNodeView(n.id, n.type);

        const appearT = clamp01((now - n.createdAt) / PARAMS.appearSeconds);
        const pop = appearT < 1 ? 1 + Math.sin(appearT * Math.PI) * 0.12 : 1;
        const s = lerp(0.2, 1.0, appearT) * pop;
        view.root.scale.set(s);

        view.root.x = pos.x;
        view.root.y = pos.y;

        const r = nodeRadius(n.type);

        const statusAlpha =
          n.status === "rejected" || n.status === "expired"
            ? 0.35
            : n.status === "failed"
              ? 0.55
              : 1.0;
        const fade =
          n.fadeOutAt != null && n.fadeOutDuration
            ? clamp01(1 - (now - n.fadeOutAt) / n.fadeOutDuration)
            : 1.0;
        view.root.alpha = statusAlpha * fade;

        const weight = sumStakes(sim.stakes[n.id], "weight");
        const stakeThreshold = stakeThresholdForNode(n.type);
        const targetFill = stakeThreshold > 0 ? clamp01(weight / stakeThreshold) : 0;
        view.fillLevel = lerp(view.fillLevel, targetFill, 0.12);
        const stakeEligible = stakeThreshold > 0 && weight >= stakeThreshold;
        const canShowFunding =
          n.type === "budget" &&
          n.minBudget != null &&
          (n.status === "funding" ||
            n.status === "active" ||
            n.status === "capped" ||
            n.status === "succeeded");
        const fundingTarget = canShowFunding && n.minBudget ? clamp01(n.treasury / n.minBudget) : 0;
        view.fundingLevel = lerp(view.fundingLevel, fundingTarget, 0.12);

        const stakeDriven =
          (n.type === "budget" || n.type === "mech") && !isBlockedStatus(n.status);
        const c = stakeDriven
          ? stakeEligible
            ? STAKE_ELIGIBLE_COLOR
            : STAKE_NEEDS_COLOR
          : statusColorHex(n.type, n.status);
        view.circle.clear();
        if (n.type === "payee") {
          const payeeColor = 0xffd966;
          // Draw a pawn-like person shape
          const headR = r * 0.45;
          const headY = -r * 0.6;
          const bodyTopY = headY + headR * 0.5;
          const bodyBottomY = r * 0.9;
          const bodyTopW = r * 0.35;
          const bodyBottomW = r * 0.9;
          // Head
          view.circle.circle(0, headY, headR).fill({ color: payeeColor, alpha: 0.95 });
          // Body (tapered bell shape using bezier)
          view.circle
            .moveTo(-bodyTopW, bodyTopY)
            .bezierCurveTo(
              -bodyBottomW,
              bodyBottomY * 0.4,
              -bodyBottomW,
              bodyBottomY,
              0,
              bodyBottomY
            )
            .bezierCurveTo(
              bodyBottomW,
              bodyBottomY,
              bodyBottomW,
              bodyBottomY * 0.4,
              bodyTopW,
              bodyTopY
            )
            .closePath()
            .fill({ color: payeeColor, alpha: 0.95 });
        } else {
          view.circle.circle(0, 0, r).fill({ color: c, alpha: 0.18 });
          view.circle.circle(0, 0, r).stroke({ width: 1.5, color: c, alpha: 0.9 });
        }

        view.fill.clear();
        view.fundingFill.clear();
        view.mask.clear();
        if (stakeThreshold > 0) {
          const innerR = r - 1;
          const fillHeight = innerR * 2 * view.fillLevel;
          const topY = innerR - fillHeight;
          const waveAmp = Math.max(0.8, 3 * (1 - view.fillLevel));
          const wavePhase = view.wavePhase + now * 2.2;
          const segments = 12;

          view.mask.circle(0, 0, innerR).fill({ color: 0xffffff, alpha: 1 });

          view.fill.moveTo(-innerR, innerR).lineTo(-innerR, topY);
          for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const x = -innerR + 2 * innerR * t;
            const y = topY + Math.sin(t * Math.PI * 2 + wavePhase) * waveAmp;
            view.fill.lineTo(x, y);
          }
          view.fill
            .lineTo(innerR, innerR)
            .closePath()
            .fill({
              color: stakeEligible ? STAKE_ELIGIBLE_COLOR : STAKE_NEEDS_COLOR,
              alpha: 0.22,
            });

          if (canShowFunding && view.fundingLevel > 0) {
            const fundingHeight = innerR * 2 * view.fundingLevel;
            const fundingTop = innerR - fundingHeight;
            const fundingWave = Math.max(0.6, 2 * (1 - view.fundingLevel));
            view.fundingFill.moveTo(-innerR, innerR).lineTo(-innerR, fundingTop);
            for (let i = 0; i <= segments; i++) {
              const t = i / segments;
              const x = -innerR + 2 * innerR * t;
              const y = fundingTop + Math.sin(t * Math.PI * 2 + wavePhase * 0.8) * fundingWave;
              view.fundingFill.lineTo(x, y);
            }
            view.fundingFill
              .lineTo(innerR, innerR)
              .closePath()
              .fill({ color: FUNDING_FILL_COLOR, alpha: 0.32 });
          }
        }

        if (n.type === "payee") {
          view.label.text = "";
          view.sub.text = "";
          view.label.visible = false;
          view.sub.visible = false;
        } else {
          view.label.visible = true;
          view.sub.visible = true;
          view.label.text = n.title;
          view.label.x = 0;
          view.label.y = r + 8;
        }

        if (n.type === "goal") {
          view.sub.text = `Treasury ${formatUSD(n.treasury)}`;
        } else if (n.type === "budget") {
          if (n.status === "failed") {
            view.sub.text = n.failReason ?? "Failed";
          } else if (
            stakeEligible ||
            n.status === "active" ||
            n.status === "capped" ||
            n.status === "succeeded"
          ) {
            view.sub.text = `Treasury ${formatUSD(n.treasury)}`;
          } else {
            view.sub.text = "";
          }
        } else if (n.type === "mech") {
          view.sub.text = "";
        } else {
          view.sub.text = "";
        }
        if (n.type !== "payee") {
          view.sub.x = 0;
          view.sub.y = view.label.y + view.label.height + 4;
        }
      }
    }

    function updateEdgesAndParticles(dt: number) {
      edgesGfx.clear();
      beamGfx.clear();

      const resolveBeamPoint = (endpoint: BeamEndpoint) => {
        if (endpoint.type === "point") return { x: endpoint.x, y: endpoint.y };
        if (endpoint.type === "actor") {
          const actor = actors[endpoint.id];
          return actor ? { x: actor.x, y: actor.y - 20 } : null;
        }
        if (endpoint.type === "node") {
          const target = positions[endpoint.id];
          return target ? { x: target.x, y: target.y } : null;
        }
        return null;
      };

      for (let i = beams.length - 1; i >= 0; i--) {
        const beam = beams[i];
        beam.ttl -= dt;
        if (beam.ttl <= 0) {
          beams.splice(i, 1);
          continue;
        }

        const from = resolveBeamPoint(beam.from);
        const to = resolveBeamPoint(beam.to);
        if (!from || !to) continue;

        const fade = beam.ttl / beam.max;
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const len = Math.max(1, Math.hypot(dx, dy));
        const ux = dx / len;
        const uy = dy / len;
        const nx = -uy;
        const ny = ux;
        const offset = 6;
        const x0 = from.x + ux * offset;
        const y0 = from.y + uy * offset;
        const x1 = to.x - ux * offset;
        const y1 = to.y - uy * offset;

        const wobble = Math.sin(sim.now * 3 + beam.phase) * 18 * fade;
        const c1x = x0 + dx * 0.3 + nx * wobble;
        const c1y = y0 + dy * 0.3 + ny * wobble;
        const c2x = x0 + dx * 0.7 + nx * wobble;
        const c2y = y0 + dy * 0.7 + ny * wobble;

        beamGfx
          .moveTo(x0, y0)
          .bezierCurveTo(c1x, c1y, c2x, c2y, x1, y1)
          .stroke({
            width: 10,
            color: beam.color,
            alpha: 0.08 * fade,
            cap: "round",
            join: "round",
            pixelLine: false,
          });
        beamGfx
          .moveTo(x0, y0)
          .bezierCurveTo(c1x, c1y, c2x, c2y, x1, y1)
          .stroke({
            width: 5,
            color: beam.color,
            alpha: 0.24 * fade,
            cap: "round",
            join: "round",
            pixelLine: false,
          });
        beamGfx
          .moveTo(x0, y0)
          .bezierCurveTo(c1x, c1y, c2x, c2y, x1, y1)
          .stroke({
            width: 2,
            color: 0xffffff,
            alpha: 0.7 * fade,
            cap: "round",
            join: "round",
            pixelLine: false,
          });
      }

      for (const e of sim.edges) {
        const a = positions[e.from];
        const b = positions[e.to];
        if (!a || !b) continue;

        const fromNode = sim.nodes[e.from];
        const toNode = sim.nodes[e.to];
        if (!fromNode || !toNode) continue;

        const r0 = nodeRadius(fromNode.type);
        const r1 = nodeRadius(toNode.type);

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.max(1, Math.hypot(dx, dy));
        const ux = dx / len;
        const uy = dy / len;

        const x0 = a.x + ux * (r0 + 2);
        const y0 = a.y + uy * (r0 + 2);
        const x1 = b.x - ux * (r1 + 2);
        const y1 = b.y - uy * (r1 + 2);

        const wobble = Math.sin(sim.now * 1.6 + (e.id.length % 7)) * 16;
        const nx = -uy;
        const ny = ux;
        const c1x = x0 + dx * 0.35 + nx * wobble;
        const c1y = y0 + dy * 0.35 + ny * wobble;
        const c2x = x0 + dx * 0.65 + nx * wobble;
        const c2y = y0 + dy * 0.65 + ny * wobble;

        const isActive = e.rate > 0 && e.eligible;
        const width = isActive ? Math.min(6, 1 + Math.log1p(e.rate / 250)) : 1;
        const alpha = isActive ? 0.55 : 0.18;

        const color = e.kind === "payout" ? 0x9aa4b2 : e.capped ? 0xffc857 : 0xe6edf3;

        edgesGfx.moveTo(x0, y0).bezierCurveTo(c1x, c1y, c2x, c2y, x1, y1).stroke({
          width,
          color,
          alpha,
          pixelLine: false,
        });

        if (isActive && e.rate > 0) {
          spawnAlongEdge(e.id, x0, y0, x1, y1, e.rate, e.kind, dt);
        }
      }

      for (let i = activeParticles.length - 1; i >= 0; i--) {
        const fp = activeParticles[i];
        fp.t += (fp.speed / fp.len) * dt;

        const fade = clamp01((1 - fp.t) / 0.25);
        fp.p.alpha = fp.alpha0 * fade;

        if (fp.t >= 1) {
          particleLayer.removeParticle(fp.p);
          activeParticles.splice(i, 1);
          pool.push(fp);
          continue;
        }

        fp.p.x = lerp(fp.x0, fp.x1, fp.t);
        fp.p.y = lerp(fp.y0, fp.y1, fp.t);
      }
    }

    function handlePendingEvents() {
      if (pendingEvents.length === 0) return;

      for (const ev of pendingEvents) {
        if (ev.type === "STAKE_WEIGHT_SET") {
          if (ev.actor !== "system") {
            const actor = ev.actor as ActorKey;
            const actorConf = actors[actor];
            const target = positions[ev.nodeId];
            const node = sim.nodes[ev.nodeId];
            if (actorConf && target && node && !isBlockedStatus(node.status)) {
              beamBurst(
                { type: "actor", id: actor },
                { type: "node", id: ev.nodeId },
                actorConf.tint
              );
            }
          }
        }

        if (ev.type === "BUDGET_PROPOSE") {
          triggerShake(4, 0.35);
          simulation?.alpha(0.9);
        }

        if (ev.type === "MECH_PROPOSE") {
          triggerShake(2.5, 0.28);
          simulation?.alpha(0.7);
        }

        if (ev.type === "PAYEE_ADD") {
          const actor = ev.actor as ActorKey;
          const actorConf = actors[actor];
          if (actorConf && positions[ev.mechId]) {
            beamBurst({ type: "actor", id: actor }, { type: "node", id: ev.mechId }, 0xffd966);
          }
        }

        if (ev.type === "PAYEE_REMOVE") {
          const actor = ev.actor as ActorKey;
          const actorConf = actors[actor];
          if (actorConf && positions[ev.mechId]) {
            beamBurst({ type: "actor", id: actor }, { type: "node", id: ev.mechId }, 0xb38600);
          }
        }
      }

      pendingEvents = [];
    }

    function getGoalCenterPoint() {
      const renderer = app!.renderer;
      return { x: renderer.width * 0.5, y: renderer.height * 0.5 };
    }

    function beamProposer(ev: DaoEvent) {
      if (ev.type !== "GOAL_CREATE" && ev.type !== "BUDGET_PROPOSE") return;
      if (!ev.by || ev.by === "system") return;
      const actor = ev.by as ActorKey;
      const actorConf = actors[actor];
      if (!actorConf) return;

      if (ev.type === "GOAL_CREATE") {
        beamBurst(
          { type: "actor", id: actor },
          { type: "point", ...getGoalCenterPoint() },
          actorConf.tint
        );
        return;
      }

      const goalId = sim.goalId;
      if (goalId && positions[goalId]) {
        beamBurst({ type: "actor", id: actor }, { type: "node", id: goalId }, actorConf.tint);
      } else {
        beamBurst(
          { type: "actor", id: actor },
          { type: "point", ...getGoalCenterPoint() },
          actorConf.tint
        );
      }
    }

    app.ticker.add((time) => {
      if (destroyed) return;

      const dt = Math.min(0.05, (time.deltaTime ?? 1) / 60);
      sim.now += dt;

      if (sim.now > PARAMS.loopAt) {
        resetSim();
        return;
      }

      while (eventIndex < timeline.length && timeline[eventIndex].t <= sim.now) {
        const ev = timeline[eventIndex];
        beamProposer(ev);
        applyEvent(sim, ev);
        pendingEvents.push(ev);
        eventIndex++;
      }

      computeStreamingAndEdges(sim, dt);
      autoSpawnMechs();
      autoSpawnPayees();

      pruneFadedBudgets();
      updateLayoutIfNeeded();
      stepForces(dt);
      updatePositions(sim.now, dt);
      handlePendingEvents();
      updateActorPositions(sim.now, dt);
      updateActorViews();
      updateNodeViews();
      updateEdgesAndParticles(dt);
    });
  })();

  return () => {
    destroyed = true;
    try {
      app?.destroy(true);
    } catch {
      // ignore
    }
  };
}
