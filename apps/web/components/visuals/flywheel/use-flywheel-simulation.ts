"use client";

import { useEffect, useRef, useState } from "react";
import { InteractionType } from "./social-post";
import { PricePoint } from "./price-chart";
import { Bubble } from "./bubble-flow";
import { WorkItem } from "./earn-section";
import {
  CLEANUP_BUFFER,
  INTERACTION_CONFIG,
  INITIAL_COUNTS,
  INITIAL_HISTORY,
  INITIAL_ITEMS,
  LEG_DELAY,
  LEG_ORDER,
  WORK_TYPES,
} from "./simulation/constants";
import { useFlywheelActions } from "./simulation/use-flywheel-actions";
import type {
  BubbleKind,
  Burst,
  InteractionQueueItem,
  LiveBubble,
  ScheduledEvent,
} from "./simulation/types";

export function useFlywheelSimulation() {
  const [engageBubbles, setEngageBubbles] = useState<Bubble[]>([]);
  const [tokenBubbles, setTokenBubbles] = useState<Bubble[]>([]);
  const [contentBubbles, setContentBubbles] = useState<Bubble[]>([]);
  const [energyBubbles, setEnergyBubbles] = useState<Bubble[]>([]);

  const [priceHistory, setPriceHistory] = useState<PricePoint[]>(INITIAL_HISTORY);
  const [flashState, setFlashState] = useState<Record<InteractionType, boolean>>({
    like: false,
    comment: false,
    recast: false,
  });
  const [counts, setCounts] = useState(INITIAL_COUNTS);

  const [workLabel, setWorkLabel] = useState(WORK_TYPES[0]);
  const [isWorkAnimating, setIsWorkAnimating] = useState(false);
  const [fireworkTick, setFireworkTick] = useState(0);

  const [earnItems, setEarnItems] = useState<WorkItem[]>(INITIAL_ITEMS);

  const bubblesRef = useRef<Record<BubbleKind, LiveBubble[]>>({
    engage: [],
    token: [],
    content: [],
    energy: [],
  });

  const countsRef = useRef(INITIAL_COUNTS);
  const burstsRef = useRef<Burst[]>([]);
  const eventsRef = useRef<ScheduledEvent[]>([]);
  const interactionQueueRef = useRef<InteractionQueueItem[]>([]);
  const moveCountRef = useRef(0);
  const workIndexRef = useRef(0);
  const earnItemsRef = useRef<WorkItem[]>(INITIAL_ITEMS);
  const bubbleDirtyRef = useRef(false);
  const legIndexRef = useRef(0);
  const nextLegAtRef = useRef(0);
  const nextWorkAtRef = useRef(0);
  const bubbleIdRef = useRef(0);

  const {
    scheduleEvent,
    bumpPrice,
    spawnBubble,
    updateFlashState,
    processBursts,
    addEarnItem,
    queueInteraction,
    onInteraction,
  } = useFlywheelActions({
    bubblesRef,
    countsRef,
    burstsRef,
    eventsRef,
    interactionQueueRef,
    moveCountRef,
    earnItemsRef,
    bubbleDirtyRef,
    bubbleIdRef,
    setPriceHistory,
    setFlashState,
    setCounts,
    setEarnItems,
  });

  useEffect(() => {
    const start = performance.now();
    nextLegAtRef.current = start;
    nextWorkAtRef.current = start + 2200;

    let rafId = 0;

    const step = (now: number) => {
      const pending: ScheduledEvent[] = [];
      const remainingEvents: ScheduledEvent[] = [];
      for (const event of eventsRef.current) {
        if (event.at <= now) {
          pending.push(event);
        } else {
          remainingEvents.push(event);
        }
      }
      eventsRef.current = remainingEvents;
      pending.forEach((event) => event.run(now));

      const spawnCluster = (
        kind: BubbleKind,
        count: number,
        interval: number,
        onArrive?: () => void
      ) => {
        for (let i = 0; i < count; i++) {
          scheduleEvent(now + i * interval, (runNow) => spawnBubble(kind, runNow, onArrive));
        }
      };

      if (now >= nextLegAtRef.current) {
        const leg = LEG_ORDER[legIndexRef.current];

        if (leg === "engage") {
          interactionQueueRef.current.shift();
          const bubbles = Math.floor(Math.random() * 3) + 5;

          const allTypes: InteractionType[] = ["like", "comment", "recast"];
          const skipIndex = Math.floor(Math.random() * 3);
          const activeTypes = allTypes.filter((_, i) => i !== skipIndex);

          let totalBump = 0;
          for (const type of activeTypes) {
            const cfg = INTERACTION_CONFIG[type];
            totalBump += cfg.bump;
            burstsRef.current = [
              ...burstsRef.current,
              {
                type,
                remaining: cfg.burstCount(),
                interval: cfg.interval,
                nextAt: now,
                endAt: now + cfg.flash,
              },
            ];
          }
          updateFlashState(now);
          const bump = totalBump / 2 + Math.random() * 0.001;

          scheduleEvent(now + 500, () => {
            spawnCluster("engage", bubbles, 280, () => bumpPrice(bump));
          });
        } else if (leg === "token") {
          spawnCluster("token", Math.floor(Math.random() * 3) + 5, 300);
        } else if (leg === "energy") {
          spawnCluster("energy", Math.floor(Math.random() * 3) + 5, 300, () =>
            addEarnItem(performance.now())
          );
        } else if (leg === "content") {
          spawnCluster("content", Math.floor(Math.random() * 3) + 5, 300, () => {
            const rand = Math.random();
            const action: InteractionType = rand < 0.7 ? "like" : rand < 0.9 ? "comment" : "recast";
            queueInteraction(action);
          });
        }

        legIndexRef.current = (legIndexRef.current + 1) % 4;
        nextLegAtRef.current = now + LEG_DELAY;
      }

      if (now >= nextWorkAtRef.current) {
        setIsWorkAnimating(true);
        scheduleEvent(now + 150, () => {
          workIndexRef.current = (workIndexRef.current + 1) % WORK_TYPES.length;
          setWorkLabel(WORK_TYPES[workIndexRef.current]);
          setFireworkTick((v) => v + 1);
          setIsWorkAnimating(false);
        });
        nextWorkAtRef.current = now + 2500;
      }

      processBursts(now);

      let removedBubble = false;
      const nextViews: Record<BubbleKind, Bubble[]> = {
        engage: [],
        token: [],
        content: [],
        energy: [],
      };

      (Object.keys(bubblesRef.current) as BubbleKind[]).forEach((kind) => {
        const kept: LiveBubble[] = [];

        for (const bubble of bubblesRef.current[kind]) {
          const end = bubble.bornAt + bubble.duration;

          if (!bubble.arrived && now >= end) {
            bubble.arrived = true;
            bubble.onArrive?.();
          }

          if (now <= end + CLEANUP_BUFFER) {
            kept.push(bubble);
            nextViews[kind].push({ id: bubble.id, y: bubble.y, size: bubble.size });
          } else {
            removedBubble = true;
          }
        }

        bubblesRef.current[kind] = kept;
      });

      if (bubbleDirtyRef.current || removedBubble) {
        setEngageBubbles(nextViews.engage);
        setTokenBubbles(nextViews.token);
        setContentBubbles(nextViews.content);
        setEnergyBubbles(nextViews.energy);
        bubbleDirtyRef.current = false;
      }

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [
    addEarnItem,
    bumpPrice,
    processBursts,
    queueInteraction,
    scheduleEvent,
    spawnBubble,
    updateFlashState,
  ]);

  return {
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
  };
}
