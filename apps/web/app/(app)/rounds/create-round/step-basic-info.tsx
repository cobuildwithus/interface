"use client";

import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { StepProps } from "./types";

export function StepBasicInfo({ formData, updateFormData }: StepProps) {
  return (
    <FieldGroup className="gap-5">
      <Field>
        <FieldLabel htmlFor="round-title">Title</FieldLabel>

        <Input
          id="round-title"
          value={formData.title}
          onChange={(e) => updateFormData("title", e.target.value)}
          placeholder="e.g., Weekly Art Challenge"
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="round-description">Description</FieldLabel>

        <Textarea
          id="round-description"
          rows={2}
          value={formData.description}
          onChange={(e) => updateFormData("description", e.target.value)}
          placeholder="What is this round about?"
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="round-prompt">Prompt for duels</FieldLabel>
        <FieldDescription className="text-xs">
          Used to judge head-to-head comparisons between submissions
        </FieldDescription>
        <Textarea
          id="round-prompt"
          rows={3}
          value={formData.prompt}
          onChange={(e) => updateFormData("prompt", e.target.value)}
          placeholder="e.g., Which post best demonstrates creative thinking and engagement with the community?"
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="requirements-text">Requirements</FieldLabel>
        <FieldDescription className="text-xs">Used to grade posts for eligibility</FieldDescription>
        <Textarea
          id="requirements-text"
          rows={5}
          value={formData.requirementsText}
          onChange={(e) => updateFormData("requirementsText", e.target.value)}
          placeholder="- Must be an original work&#10;- Must include relevant hashtags&#10;- Must be posted within the round timeframe"
          className="font-mono text-sm"
        />
      </Field>
    </FieldGroup>
  );
}
