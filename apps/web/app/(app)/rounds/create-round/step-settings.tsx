"use client";

import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { MaxPostsPerUserInput } from "@/components/features/rounds/max-posts-per-user-input";
import { DateTimePicker } from "@/components/common/date-time-picker";
import {
  ToggleButtonGroup,
  STATUS_OPTIONS,
} from "@/components/features/rounds/toggle-button-group";
import { ROUND_VARIANT_OPTIONS } from "@/lib/domains/rounds/config";
import type { StepProps } from "./types";

type StepSettingsProps = StepProps & {
  dateRangeError: string | null;
};

export function StepSettings({ formData, updateFormData, dateRangeError }: StepSettingsProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">Settings & Schedule</h3>
        <p className="text-muted-foreground text-sm">
          Configure timing and additional options for your round.
        </p>
      </div>

      <FieldGroup className="gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <DateTimePicker
            label="Start"
            value={formData.startAt}
            onChange={(date) => updateFormData("startAt", date)}
          />
          <DateTimePicker
            label="End"
            value={formData.endAt}
            onChange={(date) => updateFormData("endAt", date)}
          />
        </div>

        {dateRangeError && (
          <p className="text-destructive text-sm" role="alert">
            {dateRangeError}
          </p>
        )}

        <Field>
          <FieldLabel htmlFor="post-template">Post Template</FieldLabel>
          <FieldDescription className="text-xs">
            Pre-filled text to help participants get started (optional)
          </FieldDescription>
          <Textarea
            id="post-template"
            rows={2}
            value={formData.castTemplate}
            onChange={(e) => updateFormData("castTemplate", e.target.value)}
            placeholder="My submission for the art challenge..."
          />
        </Field>

        <ToggleButtonGroup
          label="Status"
          description="Draft = hidden, Open = live"
          value={formData.status}
          onChange={(value) => updateFormData("status", value)}
          options={STATUS_OPTIONS}
        />

        <ToggleButtonGroup
          label="Display Variant"
          description="How submissions are displayed"
          value={formData.variant}
          onChange={(value) => updateFormData("variant", value)}
          options={ROUND_VARIANT_OPTIONS}
        />

        <MaxPostsPerUserInput
          value={formData.perUserLimit}
          onChange={(value) => updateFormData("perUserLimit", value)}
        />
      </FieldGroup>
    </div>
  );
}
