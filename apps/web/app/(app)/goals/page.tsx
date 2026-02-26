import { GoalCard, type Goal } from "@/components/features/goals/goal-card";
import { buildPageMetadata } from "@/lib/shared/page-metadata";

export const metadata = buildPageMetadata({
  title: "Goals | Cobuild",
  description: "Track ongoing and completed goals in the Cobuild ecosystem.",
});

const sampleGoals: Goal[] = [
  {
    id: "goal_raise1m",
    address: "raise-1-mil",
    title: "Raise $1M",
    description:
      "Prove that a crowd can raise venture-scale capital with AI coordination. No VCs, no gatekeepers—just contributors and transparent decisions.",
    raised: 127500,
    target: 1000000,
    status: "ongoing",
    createdAt: new Date("2024-11-01"),
    contributorCount: 284,
  },
  {
    id: "goal_delete_instagram",
    address: "delete-instagram",
    title: "Get 1M People to Delete Instagram",
    description:
      "Fund the campaigns, tools, and alternatives that help people leave. Track verified deletions. Reclaim attention from the algorithm.",
    raised: 127000,
    target: 500000,
    status: "ongoing",
    createdAt: new Date("2024-09-01"),
    contributorCount: 34521,
  },
  {
    id: "goal_publish_textbooks",
    address: "free-textbooks",
    title: "Publish 500 Free Textbooks",
    description:
      "Created open-source textbooks for the most common college courses. Downloaded 2.3 million times. Students saved an estimated $47M.",
    raised: 400000,
    target: 400000,
    status: "completed",
    createdAt: new Date("2024-01-01"),
    completedAt: new Date("2024-09-15"),
    contributorCount: 3241,
  },
  {
    id: "goal_clean_beaches",
    address: "clean-1000-beaches",
    title: "Clean 1,000 Beaches",
    description:
      "Organized cleanups across 34 countries. 890 tons of trash removed. Local teams paid fairly, not just volunteer labor.",
    raised: 180000,
    target: 180000,
    status: "completed",
    createdAt: new Date("2024-03-01"),
    completedAt: new Date("2024-11-20"),
    contributorCount: 12450,
  },
];

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

export default function GoalsPage() {
  const ongoingGoals = sampleGoals.filter((g) => g.status === "ongoing");
  const completedGoals = sampleGoals.filter((g) => g.status === "completed");

  return (
    <main className="w-full p-4 md:p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Goals</h1>
        <p className="text-muted-foreground mt-1">
          Crowd-funded objectives with AI coordination and human oversight.
        </p>
      </div>

      <div className="space-y-10">
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
