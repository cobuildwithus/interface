import { AlertCircle } from "lucide-react";

export function WizardAlert({ message }: { message: string }) {
  return (
    <div className="mx-6 mb-2 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/50">
      <AlertCircle className="size-4 shrink-0 text-amber-600 dark:text-amber-500" />
      <p className="text-sm text-amber-800 dark:text-amber-200" role="alert">
        {message}
      </p>
    </div>
  );
}
