"use client";

import { useCallback } from "react";
import type { Dispatch, SetStateAction, MutableRefObject } from "react";
import type { InteractionType } from "../social-post";
import type { PricePoint } from "../price-chart";
import type { WorkItem } from "../earn-section";
import { BUBBLE_DURATION, INTERACTION_CONFIG, INITIAL_COUNTS, WORKERS } from "./constants";
import { shallowEqualCounts, shallowEqualFlash } from "./utils";
import type { BubbleKind, Burst, InteractionQueueItem, LiveBubble, ScheduledEvent } from "./types";

type Counts = typeof INITIAL_COUNTS;

type FlywheelActionInput = {
  bubblesRef: MutableRefObject<Record<BubbleKind, LiveBubble[]>>;
  countsRef: MutableRefObject<Counts>;
  burstsRef: MutableRefObject<Burst[]>;
  eventsRef: MutableRefObject<ScheduledEvent[]>;
  interactionQueueRef: MutableRefObject<InteractionQueueItem[]>;
  moveCountRef: MutableRefObject<number>;
  earnItemsRef: MutableRefObject<WorkItem[]>;
  bubbleDirtyRef: MutableRefObject<boolean>;
  bubbleIdRef: MutableRefObject<number>;
  setPriceHistory: Dispatch<SetStateAction<PricePoint[]>>;
  setFlashState: Dispatch<SetStateAction<Record<InteractionType, boolean>>>;
  setCounts: Dispatch<SetStateAction<Counts>>;
  setEarnItems: Dispatch<SetStateAction<WorkItem[]>>;
};

export const useFlywheelActions = ({
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
}: FlywheelActionInput) => {
  const scheduleEvent = useCallback(
    (at: number, run: (now: number) => void) => {
      eventsRef.current.push({ at, run });
    },
    [eventsRef]
  );

  const syncEarnItems = useCallback(
    (items: WorkItem[]) => {
      earnItemsRef.current = items;
      setEarnItems(items);
    },
    [earnItemsRef, setEarnItems]
  );

  const setEarnItemPhase = useCallback(
    (id: number, phase: WorkItem["phase"]) => {
      const updated: WorkItem[] = earnItemsRef.current.map(
        (item): WorkItem => (item.id === id ? { ...item, phase } : item)
      );
      syncEarnItems(updated);
    },
    [earnItemsRef, syncEarnItems]
  );

  const bumpPrice = useCallback(
    (baseBump: number) => {
      moveCountRef.current++;
      const moveNumber = moveCountRef.current;

      setPriceHistory((prev) => {
        const last = prev[prev.length - 1];
        const amplitude = 0.3 + Math.random() * 2.2;
        const direction = moveNumber <= 4 ? 1 : Math.random() < 0.3 ? -0.5 : 1;
        const bump = baseBump * amplitude * direction;
        const noise = (Math.random() - 0.5) * 0.005;
        const newPrice = last.price * (1 + bump + noise);
        return [...prev.slice(-100), { time: Date.now(), price: newPrice }];
      });
    },
    [moveCountRef, setPriceHistory]
  );

  const spawnBubble = useCallback(
    (kind: BubbleKind, now: number, onArrive?: () => void) => {
      const newBubble: LiveBubble = {
        id: bubbleIdRef.current++,
        y: Math.random() * 40 + 30,
        size: Math.random() * 6 + 10,
        bornAt: now,
        duration: BUBBLE_DURATION,
        onArrive,
      };

      bubblesRef.current[kind] = [...bubblesRef.current[kind], newBubble];
      bubbleDirtyRef.current = true;
    },
    [bubbleDirtyRef, bubbleIdRef, bubblesRef]
  );

  const updateFlashState = useCallback(
    (now: number) => {
      const nextFlash = {
        like: burstsRef.current.some((b) => b.type === "like" && now < b.endAt),
        comment: burstsRef.current.some((b) => b.type === "comment" && now < b.endAt),
        recast: burstsRef.current.some((b) => b.type === "recast" && now < b.endAt),
      };

      setFlashState((prev) => (shallowEqualFlash(prev, nextFlash) ? prev : nextFlash));
    },
    [burstsRef, setFlashState]
  );

  const processBursts = useCallback(
    (now: number) => {
      let countsChanged = false;
      const active: Burst[] = [];

      for (const burst of burstsRef.current) {
        const next = { ...burst };

        while (next.remaining > 0 && now >= next.nextAt) {
          if (next.type === "like")
            countsRef.current = { ...countsRef.current, like: countsRef.current.like + 1 };
          if (next.type === "comment")
            countsRef.current = { ...countsRef.current, comment: countsRef.current.comment + 1 };
          if (next.type === "recast")
            countsRef.current = { ...countsRef.current, recast: countsRef.current.recast + 1 };

          countsChanged = true;
          next.remaining -= 1;
          next.nextAt += next.interval;
        }

        if (next.remaining > 0 || now < next.endAt) {
          active.push(next);
        }
      }

      burstsRef.current = active;

      if (countsChanged) {
        const nextCounts = countsRef.current;
        setCounts((prev) => (shallowEqualCounts(prev, nextCounts) ? prev : nextCounts));
      }

      updateFlashState(now);
    },
    [burstsRef, countsRef, setCounts, updateFlashState]
  );

  const addEarnItem = useCallback(
    (now: number) => {
      const currentId = earnItemsRef.current.length
        ? Math.max(...earnItemsRef.current.map((i) => i.id)) + 1
        : 0;
      const worker = WORKERS[currentId % WORKERS.length];

      const newItem: WorkItem = { id: currentId, ...worker, phase: "pending" };
      const nextItems = [newItem, ...earnItemsRef.current].slice(0, 4);
      syncEarnItems(nextItems);

      scheduleEvent(now + 300, () => {
        setEarnItemPhase(currentId, "evaluating");
      });

      scheduleEvent(now + 1200, () => {
        setEarnItemPhase(currentId, "paid");
      });
    },
    [earnItemsRef, scheduleEvent, setEarnItemPhase, syncEarnItems]
  );

  const queueInteraction = useCallback(
    (type: InteractionType) => {
      const cfg = INTERACTION_CONFIG[type];
      interactionQueueRef.current.push({
        type,
        bubbles: 1,
        bump: cfg.bump,
      });
    },
    [interactionQueueRef]
  );

  const onInteraction = useCallback(
    (type: InteractionType) => {
      queueInteraction(type);
    },
    [queueInteraction]
  );

  return {
    scheduleEvent,
    bumpPrice,
    spawnBubble,
    updateFlashState,
    processBursts,
    addEarnItem,
    queueInteraction,
    onInteraction,
  };
};
