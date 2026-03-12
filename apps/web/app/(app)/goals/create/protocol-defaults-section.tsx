import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DEFAULT_INVALID_ROUND_REWARDS_SINK,
  DEFAULT_SUBMISSION_DEPOSIT_STRATEGY,
} from "@/lib/domains/goals/create/constants";
import { goalFactoryAddress } from "@cobuild/wire";

export function ProtocolDefaultsSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Protocol Defaults</CardTitle>
        <CardDescription>
          These fields are sourced from local <code>@cobuild/wire</code> exports and are used in the
          deploy payload.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="text-muted-foreground">
          GoalFactory: <span className="text-foreground font-mono">{goalFactoryAddress}</span>
        </div>
        <div className="text-muted-foreground">
          Invalid-round rewards sink:{" "}
          <span className="text-foreground font-mono">{DEFAULT_INVALID_ROUND_REWARDS_SINK}</span>
        </div>
        <div className="text-muted-foreground">
          Submission deposit strategy:{" "}
          <span className="text-foreground font-mono">{DEFAULT_SUBMISSION_DEPOSIT_STRATEGY}</span>
        </div>
      </CardContent>
    </Card>
  );
}
