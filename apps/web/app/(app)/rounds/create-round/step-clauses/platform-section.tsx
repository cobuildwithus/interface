import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/shared/utils";
import type { ClauseDraft } from "../types";
import { ClauseCard } from "./clause-card";
import { type ClauseOption, nextAvailableType } from "./helpers";

export function PlatformSection<T extends string>({
  icon,
  label,
  accent,
  clauses,
  options,
  onAdd,
  onUpdate,
  onRemove,
}: {
  icon: React.ReactNode;
  label: string;
  accent: string;
  clauses: ClauseDraft<T>[];
  options: ClauseOption<T>[];
  onAdd: () => void;
  onUpdate: (id: string, updates: Partial<ClauseDraft<T>>) => void;
  onRemove: (id: string) => void;
}) {
  const canAdd = nextAvailableType(clauses, options) != null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn("flex size-8 items-center justify-center rounded-lg", accent)}>
            {icon}
          </div>
          <div>
            <h4 className="font-medium">{label}</h4>
            <p className="text-muted-foreground text-xs">
              {clauses.length
                ? `${clauses.length} clause${clauses.length !== 1 ? "s" : ""}`
                : "No clauses"}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onAdd} disabled={!canAdd} className="gap-1.5">
          <Plus className="size-3.5" />
          Add
        </Button>
      </div>

      {clauses.length > 0 ? (
        <div className="space-y-3">
          {clauses.map((c) => (
            <ClauseCard
              key={c.id}
              clause={c}
              options={options}
              clauses={clauses}
              onUpdate={(u) => onUpdate(c.id, u)}
              onRemove={() => onRemove(c.id)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border-2 border-dashed p-6 text-center">
          <p className="text-muted-foreground text-sm">No clauses added yet.</p>
        </div>
      )}
    </div>
  );
}
