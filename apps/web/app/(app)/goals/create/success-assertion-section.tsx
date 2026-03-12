"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CreateGoalSectionProps } from "./section-props";

export function SuccessAssertionSection({ form, updateField }: CreateGoalSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Success Assertion</CardTitle>
        <CardDescription>
          These resolver addresses are required. The form no longer ships a test resolver.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="success-liveness">Assertion liveness (hours)</Label>
            <Input
              id="success-liveness"
              inputMode="numeric"
              value={form.successLivenessHours}
              onChange={(event) => updateField("successLivenessHours", event.target.value)}
              placeholder="24"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="success-bond">Assertion bond (raw uint256)</Label>
            <Input
              id="success-bond"
              inputMode="numeric"
              value={form.successBond}
              onChange={(event) => updateField("successBond", event.target.value)}
              placeholder="0"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="success-resolver">Success resolver</Label>
          <Input
            id="success-resolver"
            value={form.successResolver}
            onChange={(event) => updateField("successResolver", event.target.value)}
            placeholder="Production resolver contract address"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="budget-success-resolver">Budget success resolver</Label>
          <Input
            id="budget-success-resolver"
            value={form.budgetSuccessResolver}
            onChange={(event) => updateField("budgetSuccessResolver", event.target.value)}
            placeholder="Production budget resolver contract address"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="success-spec">Success spec (plain text hashed to bytes32)</Label>
          <Textarea
            id="success-spec"
            value={form.successSpec}
            onChange={(event) => updateField("successSpec", event.target.value)}
            placeholder="Detailed oracle spec text"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="success-policy">Success policy (plain text hashed to bytes32)</Label>
          <Textarea
            id="success-policy"
            value={form.successPolicy}
            onChange={(event) => updateField("successPolicy", event.target.value)}
            placeholder="Policy constraints for success assertion"
          />
        </div>
      </CardContent>
    </Card>
  );
}
