"use client";

import { useTransition } from "react";
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
import {
  INITIAL_CREATE_ROUND_FORM_DATA,
  buildCreateRoundPayload,
  getCreateRoundDateRangeError,
  validateCreateRoundStep,
} from "@/lib/domains/rounds/create-round";
import { createRound } from "../actions";
import { useWizard } from "./use-wizard";
import { StepIndicator } from "./step-indicator";
import { StepBasicInfo } from "./step-basic-info";
import { StepClauses } from "./step-clauses";
import { StepSettings } from "./step-settings";
import { STEPS } from "./constants";
import { WizardAlert } from "./wizard-alert";

type CreateRoundDialogProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function CreateRoundDialog({ open, onOpenChange }: CreateRoundDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const wizard = useWizard({
    steps: STEPS,
    initialData: INITIAL_CREATE_ROUND_FORM_DATA,
    validate: validateCreateRoundStep,
  });

  const dateRangeError = getCreateRoundDateRangeError(wizard.data);

  const handleClose = () => {
    wizard.reset();
    onOpenChange?.(false);
  };

  const handleCreate = () => {
    wizard.setError(null);
    const result = validateCreateRoundStep(wizard.currentStep, wizard.data);
    if (!result.ok) {
      wizard.setError(result.error);
      return;
    }

    startTransition(async () => {
      const payload = buildCreateRoundPayload(wizard.data);
      if (!payload.ok) {
        wizard.setError(payload.error);
        return;
      }

      const res = await createRound(payload.value);

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
            steps={STEPS}
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
