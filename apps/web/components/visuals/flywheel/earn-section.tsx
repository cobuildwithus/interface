"use client";

export interface WorkItem {
  id: number;
  name: string;
  task: string;
  amount: number;
  phase: "pending" | "evaluating" | "paid";
}

interface EarnSectionProps {
  items: WorkItem[];
}

export function EarnSection({ items }: EarnSectionProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-xs tracking-widest text-neutral-500 uppercase">Earn</div>
      <div className="h-[240px] w-80 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950/50 sm:w-96">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2">
          <span className="text-[10px] tracking-wider text-neutral-500 uppercase">
            Recent payouts
          </span>
        </div>

        {/* List */}
        <div className="space-y-1.5 p-2">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-lg bg-neutral-900/50 px-3 py-2 transition-all duration-300"
              style={{
                opacity: 1 - index * 0.15,
                transform: `translateY(${index === 0 && item.phase === "pending" ? -4 : 0}px)`,
              }}
            >
              {/* Avatar placeholder */}
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-linear-to-br from-neutral-700 to-neutral-800 text-[10px] font-medium text-neutral-400">
                {item.name.charAt(1).toUpperCase()}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium text-neutral-300">{item.name}</div>
                <div className="truncate text-[10px] text-neutral-500">{item.task}</div>
              </div>

              {/* Status / Amount */}
              <div className="flex items-center gap-2">
                {item.phase === "pending" && (
                  <span className="text-[10px] text-neutral-600">pending</span>
                )}
                {item.phase === "evaluating" && (
                  <div className="flex items-center gap-1.5">
                    <svg
                      className="h-3 w-3 animate-spin text-amber-500"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="3"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    <span className="text-[10px] font-medium text-amber-500">AI evaluating</span>
                  </div>
                )}
                {item.phase === "paid" && (
                  <span className="animate-in fade-in text-xs font-semibold text-emerald-400 tabular-nums duration-300">
                    +${item.amount}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="max-w-xs text-center text-xs text-neutral-400">
        AI + market signals verify work and distribute rewards.
      </p>
    </div>
  );
}
