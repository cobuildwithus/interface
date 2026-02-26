import { useState, useCallback } from "react";

export type WizardStep = {
  id: number;
  label: string;
};

type UseWizardOptions<TData> = {
  steps: WizardStep[];
  initialData: TData;
  validate?: (step: number, data: TData) => { ok: boolean; error?: string };
};

export function useWizard<TData>({ steps, initialData, validate }: UseWizardOptions<TData>) {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<TData>(initialData);
  const [error, setError] = useState<string | null>(null);

  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === steps.length;

  const updateData = useCallback(<K extends keyof TData>(key: K, value: TData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const reset = useCallback(() => {
    setData(initialData);
    setCurrentStep(1);
    setError(null);
  }, [initialData]);

  const goToStep = useCallback(
    (step: number) => {
      if (step >= 1 && step <= currentStep) {
        setError(null);
        setCurrentStep(step);
      }
    },
    [currentStep]
  );

  const next = useCallback(() => {
    setError(null);
    if (validate) {
      const result = validate(currentStep, data);
      if (!result.ok) {
        setError(result.error ?? "Please fix the errors before continuing.");
        return false;
      }
    }
    if (currentStep < steps.length) {
      setCurrentStep((s) => s + 1);
      return true;
    }
    return false;
  }, [currentStep, data, steps.length, validate]);

  const back = useCallback(() => {
    setError(null);
    if (currentStep > 1) {
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  return {
    currentStep,
    data,
    error,
    setError,
    isFirstStep,
    isLastStep,
    updateData,
    reset,
    goToStep,
    next,
    back,
  };
}
