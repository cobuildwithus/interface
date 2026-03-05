import Link from "next/link";
import type { GoalMilestone as GoalMilestoneItem } from "@/lib/domains/goals/goal-data";

type GoalMilestonesProps = {
  milestones: GoalMilestoneItem[];
};

export function GoalMilestones({ milestones }: GoalMilestonesProps) {
  if (milestones.length === 0) {
    return (
      <section aria-labelledby="goal-milestones" className="relative">
        <h3
          id="goal-milestones"
          className="text-muted-foreground mb-4 text-xs font-medium tracking-widest uppercase"
        >
          Milestones
        </h3>
        <p className="text-muted-foreground text-sm">No onchain milestones yet.</p>
      </section>
    );
  }

  return (
    <section aria-labelledby="goal-milestones" className="relative">
      <h3
        id="goal-milestones"
        className="text-muted-foreground mb-8 text-xs font-medium tracking-widest uppercase"
      >
        Milestones
      </h3>

      <div className="relative">
        <div className="bg-border absolute top-[10px] bottom-4 left-[5px] w-px" />

        <div className="space-y-10">
          {milestones.map((milestone) => (
            <div key={milestone.id} className="group relative flex gap-8">
              <div className="relative z-10 mt-[8px]">
                <div className="border-foreground bg-background group-hover:bg-foreground h-3 w-3 rounded-full border-2 transition-colors" />
              </div>

              <div className="flex-1 space-y-1.5">
                <div className="flex items-baseline gap-3">
                  <h4 className="text-lg font-medium tracking-tight">
                    {milestone.link ? (
                      <Link
                        href={milestone.link.href}
                        target="_blank"
                        rel="noreferrer"
                        className="decoration-muted-foreground/40 hover:decoration-foreground underline underline-offset-4 transition-colors"
                      >
                        {milestone.title}
                      </Link>
                    ) : (
                      milestone.title
                    )}
                  </h4>
                  <span className="text-muted-foreground text-sm tabular-nums">
                    {milestone.date}
                  </span>
                </div>
                <p className="text-muted-foreground text-base">{milestone.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
