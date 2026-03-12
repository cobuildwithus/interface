import type {
  CreateGoalFormFieldUpdater,
  CreateGoalFormState,
} from "@/lib/domains/goals/create/types";

export type CreateGoalSectionProps = {
  form: CreateGoalFormState;
  updateField: CreateGoalFormFieldUpdater;
};
