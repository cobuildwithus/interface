"use client";

import { useState } from "react";
import { AuthButton } from "@/components/ui/auth-button";
import { INITIAL_CREATE_GOAL_FORM_STATE } from "@/lib/domains/goals/create/constants";
import { useCreateGoal } from "@/lib/domains/goals/create/use-create-goal";
import type { CreateGoalFormState } from "@/lib/domains/goals/create/types";
import { BudgetTcrConfigSection } from "./budget-tcr-config-section";
import { CreateGoalFeedback } from "./create-goal-feedback";
import { FundingTimingSection } from "./funding-timing-section";
import { GoalDetailsSection } from "./goal-details-section";
import { ProtocolDefaultsSection } from "./protocol-defaults-section";
import { SuccessAssertionSection } from "./success-assertion-section";
import { TreasuryPoliciesSection } from "./treasury-policies-section";

export function CreateGoalForm() {
  const [form, setForm] = useState(INITIAL_CREATE_GOAL_FORM_STATE);
  const { createGoal, deployment, formError, isLoading } = useCreateGoal();

  const updateField = <K extends keyof CreateGoalFormState>(
    key: K,
    value: CreateGoalFormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <GoalDetailsSection form={form} updateField={updateField} />
      <FundingTimingSection form={form} updateField={updateField} />
      <SuccessAssertionSection form={form} updateField={updateField} />
      <TreasuryPoliciesSection form={form} updateField={updateField} />
      <BudgetTcrConfigSection form={form} updateField={updateField} />
      <ProtocolDefaultsSection />

      <div className="space-y-3">
        <CreateGoalFeedback deployment={deployment} formError={formError} />

        <AuthButton
          onClick={() => createGoal(form)}
          disabled={isLoading}
          connectLabel="Connect wallet"
          className="w-full md:w-auto"
        >
          {isLoading ? "Deploying..." : "Create goal"}
        </AuthButton>
      </div>
    </div>
  );
}
