"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type FlagSubmissionRemovalFormProps = {
  reason: string;
  onReasonChange: (value: string) => void;
  alsoUpdateRequirements: boolean;
  onAlsoUpdateRequirementsChange: (value: boolean) => void;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  pendingLabel?: string;
};

export function FlagSubmissionRemovalForm({
  reason,
  onReasonChange,
  alsoUpdateRequirements,
  onAlsoUpdateRequirementsChange,
  isPending,
  onCancel,
  onConfirm,
  confirmLabel = "Confirm Removal",
  pendingLabel = "Flagging…",
}: FlagSubmissionRemovalFormProps) {
  return (
    <>
      <p className="text-destructive mb-3 text-sm font-medium">Flag this submission for removal</p>
      <Textarea
        value={reason}
        onChange={(e) => onReasonChange(e.target.value)}
        placeholder="Reason for removal…"
        rows={3}
        autoFocus
        className="focus-visible:border-destructive focus-visible:ring-destructive/50"
      />
      <label className="text-muted-foreground mt-3 flex cursor-pointer items-start gap-2 text-sm select-none">
        <input
          type="checkbox"
          className="border-border accent-destructive mt-0.5 h-4 w-4 rounded border"
          checked={alsoUpdateRequirements}
          onChange={(e) => onAlsoUpdateRequirementsChange(e.target.checked)}
        />
        <span>Also update requirements text to filter out submissions like this going forward</span>
      </label>
      <div className="mt-3 flex gap-2">
        <Button variant="outline" onClick={onCancel} className="flex-1" disabled={isPending}>
          Cancel
        </Button>
        <Button
          variant="destructive"
          onClick={onConfirm}
          disabled={isPending || !reason.trim()}
          className="flex-1"
        >
          {isPending ? pendingLabel : confirmLabel}
        </Button>
      </div>
    </>
  );
}
