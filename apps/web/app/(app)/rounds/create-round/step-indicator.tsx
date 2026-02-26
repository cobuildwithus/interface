"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/shared/utils";
import type { WizardStep } from "./use-wizard";

type StepIndicatorProps = {
  steps: WizardStep[];
  currentStep: number;
  onStepClick?: (step: number) => void;
};

export function StepIndicator({ steps, currentStep, onStepClick }: StepIndicatorProps) {
  return (
    <div className="relative flex items-start justify-between">
      {/* Connection lines */}
      <div className="absolute top-5 right-0 left-0 flex -translate-y-1/2 px-[60px]">
        {steps.slice(0, -1).map((step, i) => (
          <div key={i} className="bg-muted h-0.5 flex-1 rounded-full">
            <div
              className={cn(
                "h-full rounded-full bg-emerald-500 transition-all duration-500",
                currentStep > step.id ? "w-full" : "w-0"
              )}
            />
          </div>
        ))}
      </div>

      {/* Steps */}
      {steps.map((step) => {
        const isCompleted = currentStep > step.id;
        const isCurrent = currentStep === step.id;
        const canClick = onStepClick && (isCompleted || isCurrent);

        return (
          <button
            key={step.id}
            type="button"
            onClick={() => canClick && onStepClick?.(step.id)}
            disabled={!canClick}
            className={cn(
              "relative z-10 flex flex-col items-center gap-2",
              canClick ? "cursor-pointer" : "cursor-default"
            )}
          >
            <div
              className={cn(
                "flex size-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all duration-300",
                isCompleted && "border-emerald-500 bg-emerald-500 text-white",
                isCurrent && "border-foreground bg-background text-foreground ring-muted ring-4",
                !isCompleted &&
                  !isCurrent &&
                  "border-muted-foreground/30 bg-muted/50 text-muted-foreground"
              )}
            >
              {isCompleted ? <Check className="size-5" strokeWidth={3} /> : step.id}
            </div>
            <span
              className={cn(
                "text-xs font-medium",
                isCurrent && "text-foreground",
                isCompleted && "text-emerald-600 dark:text-emerald-400",
                !isCompleted && !isCurrent && "text-muted-foreground"
              )}
            >
              {step.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
