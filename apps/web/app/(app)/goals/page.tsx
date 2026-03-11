import Link from "next/link";
import { GoalCard, type Goal } from "@/components/features/goals/goal-card";
import { Button } from "@/components/ui/button";
import { getGoalCards } from "@/lib/domains/goals/goal-data";
import { buildPageMetadata } from "@/lib/shared/page-metadata";

export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata({
  title: "Goals | Cobuild",
  description: "Track ongoing and completed goals in the Cobuild ecosystem.",
});

function GoalSection({
  title,
  description,
  goals,
}: {
  title: string;
  description: string;
  goals: Goal[];
}) {
  return (
    <section>
      <div className="mb-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {goals.map((goal) => (
          <GoalCard key={goal.id} goal={goal} />
        ))}
      </div>
    </section>
  );
}

export default async function GoalsPage() {
  const goals = await getGoalCards();
  const ongoingGoals = goals.filter((goal) => goal.status === "ongoing");
  const completedGoals = goals.filter((goal) => goal.status === "completed");

  return (
    <main className="w-full p-4 md:p-6">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Goals</h1>
          <p className="text-muted-foreground mt-1">
            Crowd-funded objectives with AI coordination and human oversight.
          </p>
        </div>
        <Button asChild>
          <Link href="/goals/create">Create goal</Link>
        </Button>
      </div>

      <div className="space-y-10">
        {goals.length === 0 ? (
          <div className="text-muted-foreground rounded-xl border border-dashed p-8 text-center">
            No goals have been indexed yet.
          </div>
        ) : null}

        <GoalSection
          title="Ongoing"
          description="Active goals the crowd is working toward"
          goals={ongoingGoals}
        />

        {completedGoals.length > 0 && (
          <GoalSection
            title="Completed"
            description="Goals the crowd has achieved together"
            goals={completedGoals}
          />
        )}
      </div>
    </main>
  );
}
