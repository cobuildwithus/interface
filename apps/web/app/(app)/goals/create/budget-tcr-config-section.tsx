"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BUDGET_TCR_CONFIG_PLACEHOLDER } from "@/lib/domains/goals/create/constants";
import type { CreateGoalSectionProps } from "./section-props";

export function BudgetTcrConfigSection({ form, updateField }: CreateGoalSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget TCR Configuration</CardTitle>
        <CardDescription>
          Paste explicit production BudgetTCR and arbitrator settings. The public form no longer
          ships hidden oracle or dispute defaults. Use quoted decimal strings for large integer
          values.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Label htmlFor="budget-tcr-config">Budget TCR config (JSON)</Label>
        <Textarea
          id="budget-tcr-config"
          value={form.budgetTcrConfig}
          onChange={(event) => updateField("budgetTcrConfig", event.target.value)}
          placeholder={BUDGET_TCR_CONFIG_PLACEHOLDER}
          className="min-h-72 font-mono text-xs"
        />
      </CardContent>
    </Card>
  );
}
