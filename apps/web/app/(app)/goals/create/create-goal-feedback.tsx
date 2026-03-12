import type { CreateGoalDeploymentState } from "@/lib/domains/goals/create/types";

type CreateGoalFeedbackProps = {
  deployment: CreateGoalDeploymentState | null;
  formError: string | null;
};

export function CreateGoalFeedback({ deployment, formError }: CreateGoalFeedbackProps) {
  return (
    <>
      {formError ? (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {formError}
        </div>
      ) : null}

      {deployment ? (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
          <div>Transaction: {deployment.txHash}</div>
          {deployment.goalRevnetId ? <div>Goal Revnet ID: {deployment.goalRevnetId}</div> : null}
          {deployment.goalTreasury ? <div>Goal Treasury: {deployment.goalTreasury}</div> : null}
          {deployment.goalFlow ? <div>Goal Flow: {deployment.goalFlow}</div> : null}
        </div>
      ) : null}
    </>
  );
}
