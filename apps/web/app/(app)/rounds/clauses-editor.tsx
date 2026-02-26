"use client";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
  FARCASTER_CLAUSE_LABELS,
  FARCASTER_CLAUSE_SELECT_OPTIONS,
  X_CLAUSE_LABELS,
  X_CLAUSE_SELECT_OPTIONS,
  type ClauseDraft,
  type FarcasterClauseDraftType,
  type RuleClausesDraft,
  type XClauseDraftType,
  getClauseHelpText,
  serializeClausesDraft,
} from "@/lib/domains/rules/rules/core/drafts";
import { cn } from "@/lib/shared/utils";

export { serializeClausesDraft };
export type { ClauseDraft, FarcasterClauseDraftType, RuleClausesDraft, XClauseDraftType };

const clauseHelpText = (type: string): string => getClauseHelpText(type);

function ClauseList<TType extends string>({
  title,
  labelMap,
  clauses,
  onAdd,
  onRemove,
  onUpdate,
  typeOptions,
}: {
  title: string;
  labelMap: Record<TType, string>;
  clauses: ClauseDraft<TType>[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, next: Partial<ClauseDraft<TType>>) => void;
  typeOptions: Array<{ value: TType; label: string }>;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{title}</p>
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          Add clause
        </Button>
      </div>

      {clauses.length === 0 ? (
        <p className="text-muted-foreground text-sm">No clauses yet.</p>
      ) : (
        <div className="space-y-3">
          {clauses.map((clause) => (
            <div key={clause.id} className="border-border rounded-lg border p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <select
                  className={cn(
                    "border-input bg-background ring-offset-background focus-visible:ring-ring h-9 w-full max-w-xs rounded-md border px-3 py-1 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  )}
                  value={clause.type}
                  onChange={(e) => onUpdate(clause.id, { type: e.target.value as TType })}
                >
                  {typeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Remove clause"
                  onClick={() => onRemove(clause.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>

              <Field>
                <FieldLabel>{labelMap[clause.type]}</FieldLabel>
                <FieldDescription className="text-xs">
                  {clauseHelpText(clause.type)}
                </FieldDescription>
                <Textarea
                  rows={3}
                  value={clause.raw}
                  onChange={(e) => onUpdate(clause.id, { raw: e.target.value })}
                  placeholder="One per line…"
                />
              </Field>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ClausesEditor({
  value,
  onChange,
}: {
  value: RuleClausesDraft;
  onChange: (next: RuleClausesDraft) => void;
}) {
  const farcasterOptions = FARCASTER_CLAUSE_SELECT_OPTIONS;
  const xOptions = X_CLAUSE_SELECT_OPTIONS;

  return (
    <div className="space-y-6">
      <ClauseList
        title="Farcaster clauses"
        labelMap={FARCASTER_CLAUSE_LABELS}
        clauses={value.farcaster}
        onAdd={() => {
          onChange({
            ...value,
            farcaster: [
              ...value.farcaster,
              { id: crypto.randomUUID(), type: "mentionsAll", raw: "" },
            ],
          });
        }}
        onRemove={(id) =>
          onChange({ ...value, farcaster: value.farcaster.filter((c) => c.id !== id) })
        }
        onUpdate={(id, next) =>
          onChange({
            ...value,
            farcaster: value.farcaster.map((c) => (c.id === id ? { ...c, ...next } : c)),
          })
        }
        typeOptions={farcasterOptions}
      />

      <ClauseList
        title="X clauses"
        labelMap={X_CLAUSE_LABELS}
        clauses={value.x}
        onAdd={() => {
          onChange({
            ...value,
            x: [...value.x, { id: crypto.randomUUID(), type: "mentionsAll", raw: "" }],
          });
        }}
        onRemove={(id) => onChange({ ...value, x: value.x.filter((c) => c.id !== id) })}
        onUpdate={(id, next) =>
          onChange({
            ...value,
            x: value.x.map((c) => (c.id === id ? { ...c, ...next } : c)),
          })
        }
        typeOptions={xOptions}
      />
    </div>
  );
}
