"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CreateGoalSectionProps } from "./section-props";

export function TreasuryPoliciesSection({ form, updateField }: CreateGoalSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Treasury Policies</CardTitle>
        <CardDescription>
          These spend-policy contracts are required by the deployed GoalFactory.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="goal-spend-policy">Goal spend policy</Label>
          <Input
            id="goal-spend-policy"
            value={form.goalSpendPolicy}
            onChange={(event) => updateField("goalSpendPolicy", event.target.value)}
            placeholder="0x..."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="budget-spend-policy">Budget spend policy</Label>
          <Input
            id="budget-spend-policy"
            value={form.budgetSpendPolicy}
            onChange={(event) => updateField("budgetSpendPolicy", event.target.value)}
            placeholder="0x..."
          />
        </div>
      </CardContent>
    </Card>
  );
}
