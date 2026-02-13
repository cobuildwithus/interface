"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export function ModerationDialog({
  open,
  title,
  description,
  reason,
  isPending,
  canSubmit,
  onClose,
  onReasonChange,
  onSubmit,
}: {
  open: boolean;
  title: string;
  description: string;
  reason: string;
  isPending: boolean;
  canSubmit: boolean;
  onClose: () => void;
  onReasonChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : null)}>
      <DialogContent className="space-y-3">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
        <Textarea
          value={reason}
          onChange={(event) => onReasonChange(event.target.value)}
          placeholder="Reason for hiding…"
          rows={3}
          autoFocus
          className="focus-visible:border-destructive focus-visible:ring-destructive/50"
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onSubmit} disabled={isPending || !canSubmit}>
            {isPending ? "Hiding…" : "Hide permanently"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
