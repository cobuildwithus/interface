"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, ArrowRight } from "lucide-react";
import { useCmdEnter } from "@/lib/hooks/use-cmd-enter";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createRound } from "../actions";
import { useWizard } from "./use-wizard";
import { StepIndicator } from "./step-indicator";
import { StepBasicInfo } from "./step-basic-info";
import { StepClauses } from "./step-clauses";
import { StepSettings } from "./step-settings";
import { serializeClausesDraft } from "@/lib/domains/rules/rules/core/drafts";
import { INITIAL_DATA, STEPS } from "./constants";
import { validateStep } from "./validation";
import { WizardAlert } from "./wizard-alert";

type CreateRoundDialogProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function CreateRoundDialog({ open, onOpenChange }: CreateRoundDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const wizard = useWizard({
    steps: [...STEPS],
    initialData: INITIAL_DATA,
    validate: validateStep,
  });

  const dateRangeError = useMemo(() => {
    const { startAt, endAt } = wizard.data;
    return startAt && endAt && endAt < startAt ? "End date must be on or after start date." : null;
  }, [wizard.data]);

  const handleClose = () => {
    wizard.reset();
    onOpenChange?.(false);
  };

  const handleCreate = () => {
    wizard.setError(null);
    const result = validateStep(wizard.currentStep, wizard.data);
    if (!result.ok) {
      wizard.setError(result.error);
      return;
    }

    startTransition(async () => {
      const clauses = serializeClausesDraft(wizard.data.clausesDraft);
      if (!clauses.ok) {
        wizard.setError(clauses.error);
        return;
      }

      const res = await createRound({
        title: wizard.data.title,
        prompt: wizard.data.prompt,
        description: wizard.data.description,
        castTemplate: wizard.data.castTemplate,
        clauses: clauses.value,
        requirementsText: wizard.data.requirementsText,
        perUserLimit: wizard.data.perUserLimit,
        status: wizard.data.status,
        variant: wizard.data.variant,
        startAt: wizard.data.startAt!.toISOString(),
        endAt: wizard.data.endAt!.toISOString(),
      });

      if (res.ok) {
        wizard.reset();
        onOpenChange?.(false);
        router.push(`/rounds/${res.roundId}`);
      } else {
        wizard.setError(res.error);
      }
    });
  };

  useCmdEnter(() => {
    if (isPending) return;
    if (wizard.isLastStep && !dateRangeError) handleCreate();
    else if (!wizard.isLastStep) wizard.next();
  }, open);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-xl">
        <DialogHeader className="border-border space-y-4 border-b px-6 pt-6 pb-4">
          <DialogTitle className="text-xl">Create Round</DialogTitle>
          <StepIndicator
            steps={[...STEPS]}
            currentStep={wizard.currentStep}
            onStepClick={wizard.goToStep}
          />
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {wizard.currentStep === 1 && (
            <StepBasicInfo formData={wizard.data} updateFormData={wizard.updateData} />
          )}
          {wizard.currentStep === 2 && (
            <StepClauses formData={wizard.data} updateFormData={wizard.updateData} />
          )}
          {wizard.currentStep === 3 && (
            <StepSettings
              formData={wizard.data}
              updateFormData={wizard.updateData}
              dateRangeError={dateRangeError}
            />
          )}
        </div>

        {wizard.error && <WizardAlert message={wizard.error} />}

        <DialogFooter className="border-border flex-row justify-between border-t px-6 py-4">
          <div>
            {!wizard.isFirstStep && (
              <Button variant="ghost" onClick={wizard.back} disabled={isPending}>
                <ArrowLeft className="size-4" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isPending}
              className={wizard.isFirstStep ? "" : "sm:hidden"}
            >
              Cancel
            </Button>
            {wizard.isLastStep ? (
              <Button onClick={handleCreate} disabled={isPending || !!dateRangeError}>
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Creating…
                  </>
                ) : (
                  "Create"
                )}
              </Button>
            ) : (
              <Button onClick={wizard.next} disabled={isPending}>
                Continue
                <ArrowRight className="size-4" />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
