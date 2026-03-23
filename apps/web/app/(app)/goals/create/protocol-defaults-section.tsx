import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DEFAULT_INVALID_ROUND_REWARDS_SINK,
  DEFAULT_SUBMISSION_DEPOSIT_STRATEGY,
} from "@/lib/domains/goals/create/constants";
import { COBUILD_TOKEN_ADDRESS, goalFactoryAddress } from "@cobuild/wire";

export function ProtocolDefaultsSection() {
  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">Open goal</Badge>
          <Badge variant="secondary">GoalFactory.deployOpenGoal</Badge>
        </div>
        <CardTitle>Protocol Defaults</CardTitle>
        <CardDescription>
          The create flow now uses the published <code>@cobuild/wire</code> write-contract request
          surface, so these values mirror the current open-goal deployment path exactly.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm md:grid-cols-2">
        <div className="bg-muted/30 rounded-lg border p-3">
          <div className="text-muted-foreground text-[11px] font-medium tracking-[0.16em] uppercase">
            Factory
          </div>
          <div className="text-foreground mt-2 font-mono text-xs break-all">
            {goalFactoryAddress}
          </div>
        </div>
        <div className="bg-muted/30 rounded-lg border p-3">
          <div className="text-muted-foreground text-[11px] font-medium tracking-[0.16em] uppercase">
            Funding token
          </div>
          <div className="text-foreground mt-2 font-mono text-xs break-all">
            {COBUILD_TOKEN_ADDRESS}
          </div>
        </div>
        <div className="bg-muted/30 rounded-lg border p-3">
          <div className="text-muted-foreground text-[11px] font-medium tracking-[0.16em] uppercase">
            Invalid-round rewards sink
          </div>
          <div className="text-foreground mt-2 font-mono text-xs break-all">
            {DEFAULT_INVALID_ROUND_REWARDS_SINK}
          </div>
        </div>
        <div className="bg-muted/30 rounded-lg border p-3">
          <div className="text-muted-foreground text-[11px] font-medium tracking-[0.16em] uppercase">
            Submission deposit strategy
          </div>
          <div className="text-foreground mt-2 font-mono text-xs break-all">
            {DEFAULT_SUBMISSION_DEPOSIT_STRATEGY}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
