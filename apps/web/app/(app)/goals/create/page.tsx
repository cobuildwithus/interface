import { buildPageMetadata } from "@/lib/shared/page-metadata";
import { CreateGoalForm } from "./create-goal-form";

export const metadata = buildPageMetadata({
  title: "Create Goal | Cobuild",
  description: "Deploy a new Cobuild goal permissionlessly on Base.",
});

export default function CreateGoalPage() {
  return (
    <main className="w-full p-4 md:p-6">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold">Create Goal</h1>
          <p className="text-muted-foreground mt-1">
            Operator flow for deploying a new goal stack on Base. Bring production resolver,
            spend-policy, and BudgetTCR configuration values before you submit.
          </p>
        </div>
        <CreateGoalForm />
      </div>
    </main>
  );
}
