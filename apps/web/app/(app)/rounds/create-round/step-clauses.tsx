"use client";

import { FarcasterIcon, XIcon } from "@/components/common/icons/social-icons";
import { FARCASTER_CLAUSE_OPTIONS, X_CLAUSE_OPTIONS } from "@/lib/domains/rules/rules/core/drafts";
import type { StepProps } from "./types";
import { PlatformSection } from "./step-clauses/platform-section";
import { createClause, nextAvailableType } from "./step-clauses/helpers";

export function StepClauses({ formData, updateFormData }: StepProps) {
  const { clausesDraft } = formData;

  const updateFarcaster = (next: typeof clausesDraft.farcaster) => {
    updateFormData("clausesDraft", { ...clausesDraft, farcaster: next });
  };

  const updateX = (next: typeof clausesDraft.x) => {
    updateFormData("clausesDraft", { ...clausesDraft, x: next });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">Eligibility Rules</h3>
        <p className="text-muted-foreground text-sm">
          Deterministic requirements checked before AI evaluation.
        </p>
      </div>

      <div className="space-y-6">
        <PlatformSection
          icon={<FarcasterIcon className="size-4 text-purple-600 dark:text-purple-400" />}
          label="Farcaster"
          accent="bg-purple-100 dark:bg-purple-900/30"
          clauses={clausesDraft.farcaster}
          options={FARCASTER_CLAUSE_OPTIONS}
          onAdd={() => {
            const type = nextAvailableType(clausesDraft.farcaster, FARCASTER_CLAUSE_OPTIONS);
            if (!type) return;
            updateFarcaster([...clausesDraft.farcaster, createClause(type)]);
          }}
          onUpdate={(id, u) =>
            updateFarcaster(
              clausesDraft.farcaster.map((clause) =>
                clause.id === id ? { ...clause, ...u } : clause
              )
            )
          }
          onRemove={(id) =>
            updateFarcaster(clausesDraft.farcaster.filter((clause) => clause.id !== id))
          }
        />

        <div className="border-border border-t" />

        <PlatformSection
          icon={<XIcon className="size-4" />}
          label="X (Twitter)"
          accent="bg-neutral-100 dark:bg-neutral-800"
          clauses={clausesDraft.x}
          options={X_CLAUSE_OPTIONS}
          onAdd={() => {
            const type = nextAvailableType(clausesDraft.x, X_CLAUSE_OPTIONS);
            if (!type) return;
            updateX([...clausesDraft.x, createClause(type)]);
          }}
          onUpdate={(id, u) =>
            updateX(
              clausesDraft.x.map((clause) => (clause.id === id ? { ...clause, ...u } : clause))
            )
          }
          onRemove={(id) => updateX(clausesDraft.x.filter((clause) => clause.id !== id))}
        />
      </div>
    </div>
  );
}
