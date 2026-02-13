"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useCmdEnter } from "@/lib/hooks/use-cmd-enter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldDescription, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MaxPostsPerUserInput } from "@/components/features/rounds/max-posts-per-user-input";
import { DateTimePicker } from "@/components/common/date-time-picker";
import { ToggleButtonGroup } from "@/components/features/rounds/toggle-button-group";
import { ROUND_VARIANT_OPTIONS, type RoundVariant } from "@/lib/domains/rounds/config";
import { updateRound } from "./actions";

type ManageRoundDialogProps = {
  roundId: string;
  roundTitle: string | null;
  roundDescription: string | null;
  startAt: string | null;
  endAt: string | null;
  variant: RoundVariant;
  rule: {
    id: number;
    outputTag: string;
    requirementsText: string | null;
    ctaText: string | null;
    castTemplate: string | null;
    perUserLimit: number | null;
    admins: string[];
  };
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function ManageRoundDialog({
  roundId,
  roundTitle,
  roundDescription,
  startAt: startAtIso,
  endAt: endAtIso,
  variant: initialVariant,
  rule,
  open: controlledOpen,
  onOpenChange,
}: ManageRoundDialogProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(roundTitle ?? "");
  const [description, setDescription] = useState(roundDescription ?? "");
  const [startAt, setStartAt] = useState<Date | undefined>(
    startAtIso ? new Date(startAtIso) : undefined
  );
  const [endAt, setEndAt] = useState<Date | undefined>(endAtIso ? new Date(endAtIso) : undefined);
  const [variant, setVariant] = useState<RoundVariant>(initialVariant);
  const [requirementsText, setRequirementsText] = useState(rule.requirementsText ?? "");
  const [ctaText, setCtaText] = useState(rule.ctaText ?? "");
  const [castTemplate, setCastTemplate] = useState(rule.castTemplate ?? "");
  const [perUserLimit, setPerUserLimit] = useState(rule.perUserLimit ?? 1);

  const dateRangeError = useMemo(() => {
    if (startAt && endAt && endAt.getTime() < startAt.getTime()) {
      return "End date must be on or after start date.";
    }
    return null;
  }, [startAt, endAt]);

  const resetForm = () => {
    setTitle(roundTitle ?? "");
    setDescription(roundDescription ?? "");
    setStartAt(startAtIso ? new Date(startAtIso) : undefined);
    setEndAt(endAtIso ? new Date(endAtIso) : undefined);
    setVariant(initialVariant);
    setRequirementsText(rule.requirementsText ?? "");
    setCtaText(rule.ctaText ?? "");
    setCastTemplate(rule.castTemplate ?? "");
    setPerUserLimit(rule.perUserLimit ?? 1);
    setError(null);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    setOpen(nextOpen);
  };

  const handleSave = () => {
    if (isPending || dateRangeError) return;
    setError(null);
    startTransition(async () => {
      const result = await updateRound({
        roundId,
        ruleId: rule.id,
        title,
        description,
        startAt: startAt ? startAt.toISOString() : null,
        endAt: endAt ? endAt.toISOString() : null,
        variant,
        requirementsText,
        ctaText,
        castTemplate,
        perUserLimit,
      });

      if (result.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  useCmdEnter(handleSave, open);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Round Settings</DialogTitle>
        </DialogHeader>

        <div className="-mx-6 flex-1 overflow-y-auto px-6 py-1">
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="title">Title</FieldLabel>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Round title…"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="description">Description</FieldLabel>
              <Textarea
                id="description"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this round…"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <DateTimePicker label="Start" value={startAt} onChange={setStartAt} />
              <DateTimePicker label="End" value={endAt} onChange={setEndAt} />
            </div>

            {dateRangeError ? <p className="text-destructive text-sm">{dateRangeError}</p> : null}

            <Field>
              <FieldLabel htmlFor="requirements">Requirements</FieldLabel>
              <FieldDescription className="text-xs">
                Criteria for valid submissions
              </FieldDescription>
              <Textarea
                id="requirements"
                rows={6}
                value={requirementsText}
                onChange={(e) => setRequirementsText(e.target.value)}
                placeholder="- Requirement 1&#10;- Requirement 2…"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="cta-text">CTA Button Text</FieldLabel>
              <Input
                id="cta-text"
                value={ctaText}
                onChange={(e) => setCtaText(e.target.value)}
                placeholder="Compose on Farcaster"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="post-template">Post Template</FieldLabel>
              <FieldDescription className="text-xs">Pre-filled text for new posts</FieldDescription>
              <Textarea
                id="post-template"
                rows={2}
                value={castTemplate}
                onChange={(e) => setCastTemplate(e.target.value)}
                placeholder="Template text…"
              />
            </Field>

            <MaxPostsPerUserInput value={perUserLimit} onChange={setPerUserLimit} />

            <ToggleButtonGroup
              label="Display Variant"
              description="How submissions are displayed"
              value={variant}
              onChange={setVariant}
              options={ROUND_VARIANT_OPTIONS}
            />
          </FieldGroup>
        </div>

        {error && (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        )}

        <DialogFooter className="border-border border-t pt-4">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending || Boolean(dateRangeError)}>
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
