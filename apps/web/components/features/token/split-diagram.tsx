"use client";

import { useEffect, useRef, useState } from "react";
import { BUDGETS } from "./split-diagram/constants";
import type { Particle, SplitDiagramProps } from "./split-diagram/types";

export function SplitDiagram({ splitPercent }: SplitDiagramProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [selected, setSelected] = useState<Set<number>>(() => new Set([0, 2, 4]));
  const nextId = useRef(0);
  const rafRef = useRef<number>(0);
  const lastSpawnRef = useRef(0);
  const selectedRef = useRef(selected);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  const toggleBudget = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        if (next.size > 1) next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  useEffect(() => {
    const SPAWN_INTERVAL = 600;
    const PARTICLE_SPEED = 0.018;

    function tick(timestamp: number) {
      if (timestamp - lastSpawnRef.current > SPAWN_INTERVAL) {
        lastSpawnRef.current = timestamp;
        const selectedArray = Array.from(selectedRef.current);
        if (selectedArray.length > 0) {
          setParticles((prev) => [
            ...prev,
            {
              id: nextId.current++,
              phase: "down",
              progress: 0,
              targetIndex: selectedArray[Math.floor(Math.random() * selectedArray.length)],
            },
          ]);
        }
      }

      setParticles(
        (prev) =>
          prev
            .map((p) => {
              const newProgress = p.progress + PARTICLE_SPEED;
              if (newProgress >= 1) {
                if (p.phase === "down") {
                  return { ...p, phase: "toBudget", progress: 0 } as Particle;
                }
                return null;
              }
              return { ...p, progress: newProgress };
            })
            .filter(Boolean) as Particle[]
      );

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="bg-muted/40 border-border relative flex h-80 flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border">
      <div className="relative flex w-full max-w-xl flex-col gap-4">
        <div className="bg-foreground text-background mx-auto flex h-14 w-52 items-center justify-center rounded-full text-sm font-semibold">
          $COBUILD revenue
        </div>

        <div className="text-muted-foreground/70 mx-auto text-xs tracking-[0.2em] uppercase">
          Split by budget
        </div>

        <div className="grid grid-cols-3 gap-3">
          {BUDGETS.map((budget, index) => {
            const isSelected = selected.has(index);
            return (
              <button
                key={budget.id}
                type="button"
                onClick={() => toggleBudget(index)}
                className={`border-border/60 rounded-full border px-3 py-2 text-xs font-medium transition ${
                  isSelected
                    ? "bg-foreground text-background border-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {budget.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="absolute inset-0">
        {particles.map((p) => {
          const isDown = p.phase === "down";
          const startY = isDown ? 60 : 150;
          const endY = isDown ? 150 : 240;
          const startX = 260;
          const endX = 80 + p.targetIndex * 90;
          const x = startX + (endX - startX) * p.progress;
          const y = startY + (endY - startY) * p.progress;
          return (
            <div
              key={p.id}
              className="bg-foreground absolute h-2 w-2 rounded-full"
              style={{ transform: `translate(${x}px, ${y}px)` }}
            />
          );
        })}
      </div>

      <div className="bg-muted text-foreground/80 absolute bottom-5 left-1/2 flex h-12 w-40 -translate-x-1/2 items-center justify-center rounded-full text-xs font-medium">
        {splitPercent}% to builders
      </div>
    </div>
  );
}
