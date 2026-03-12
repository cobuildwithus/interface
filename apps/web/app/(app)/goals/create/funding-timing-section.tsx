"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CreateGoalSectionProps } from "./section-props";

export function FundingTimingSection({ form, updateField }: CreateGoalSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Funding and Timing</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="initial-issuance">Initial issuance (18-decimal units)</Label>
          <Input
            id="initial-issuance"
            value={form.initialIssuance}
            onChange={(event) => updateField("initialIssuance", event.target.value)}
            placeholder="1"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="min-raise">Min raise (18-decimal units)</Label>
          <Input
            id="min-raise"
            value={form.minRaise}
            onChange={(event) => updateField("minRaise", event.target.value)}
            placeholder="100"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="duration-days">Duration (days)</Label>
          <Input
            id="duration-days"
            inputMode="numeric"
            value={form.durationDays}
            onChange={(event) => updateField("durationDays", event.target.value)}
            placeholder="30"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="min-raise-window-days">Min-raise window (days)</Label>
          <Input
            id="min-raise-window-days"
            inputMode="numeric"
            value={form.minRaiseWindowDays}
            onChange={(event) => updateField("minRaiseWindowDays", event.target.value)}
            placeholder="7"
          />
        </div>
      </CardContent>
    </Card>
  );
}
