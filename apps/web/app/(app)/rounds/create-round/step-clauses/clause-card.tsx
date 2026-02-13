import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/shared/utils";
import type { ClauseDraft } from "../types";
import { type ClauseOption, isClauseTypeTaken } from "./helpers";

export function ClauseCard<T extends string>({
  clause,
  options,
  clauses,
  onUpdate,
  onRemove,
}: {
  clause: ClauseDraft<T>;
  options: ClauseOption<T>[];
  clauses: ClauseDraft<T>[];
  onUpdate: (updates: Partial<ClauseDraft<T>>) => void;
  onRemove: () => void;
}) {
  const selected = options.find((o) => o.value === clause.type);

  return (
    <div className="bg-card rounded-xl border p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap gap-2">
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                disabled={isClauseTypeTaken(clauses, o.value, clause.id)}
                onClick={() => onUpdate({ type: o.value as T })}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                  clause.type === o.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                  isClauseTypeTaken(clauses, o.value, clause.id) &&
                    "hover:bg-muted cursor-not-allowed opacity-50"
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
          {selected && <p className="text-muted-foreground text-xs">{selected.description}</p>}
          <Textarea
            value={clause.raw}
            onChange={(e) => onUpdate({ raw: e.target.value })}
            placeholder={selected?.placeholder}
            rows={3}
            className="font-mono text-sm"
          />
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive shrink-0"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}
