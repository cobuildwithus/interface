"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CreateGoalSectionProps } from "./section-props";

export function GoalDetailsSection({ form, updateField }: CreateGoalSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Goal Details</CardTitle>
        <CardDescription>
          Curated goal metadata plus required production resolver, spend-policy, and BudgetTCR
          inputs.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="goal-name">Goal name</Label>
            <Input
              id="goal-name"
              value={form.goalName}
              onChange={(event) => updateField("goalName", event.target.value)}
              placeholder="Raise $1M for Open Science"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="goal-ticker">Ticker</Label>
            <Input
              id="goal-ticker"
              value={form.goalTicker}
              onChange={(event) =>
                updateField("goalTicker", event.target.value.toUpperCase().replace(/\s+/g, ""))
              }
              placeholder="SCI"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="goal-description">Description</Label>
          <Textarea
            id="goal-description"
            value={form.description}
            onChange={(event) => updateField("description", event.target.value)}
            placeholder="What this goal aims to achieve."
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="goal-tagline">Tagline</Label>
            <Input
              id="goal-tagline"
              value={form.tagline}
              onChange={(event) => updateField("tagline", event.target.value)}
              placeholder="Fund builders, not gatekeepers"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="goal-uri">Goal URI</Label>
            <Input
              id="goal-uri"
              value={form.goalUri}
              onChange={(event) => updateField("goalUri", event.target.value)}
              placeholder="ipfs://..."
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="goal-image-url">Image URL</Label>
            <Input
              id="goal-image-url"
              value={form.imageUrl}
              onChange={(event) => updateField("imageUrl", event.target.value)}
              placeholder="ipfs://... or https://..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="goal-site-url">Website URL</Label>
            <Input
              id="goal-site-url"
              value={form.websiteUrl}
              onChange={(event) => updateField("websiteUrl", event.target.value)}
              placeholder="https://..."
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
