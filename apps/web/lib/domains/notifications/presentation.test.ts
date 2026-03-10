import { describe, expect, it } from "vitest";
import { buildProtocolNotificationPresentation } from "./presentation";

describe("protocol notification presentation", () => {
  it("builds goal-scoped budget proposal copy and events path", () => {
    expect(
      buildProtocolNotificationPresentation({
        reason: "budget_proposed",
        actorWalletAddress: "0x00000000000000000000000000000000000000aa",
        payload: {
          labels: { goalName: "Alpha" },
          resource: {
            goalTreasury: "0x00000000000000000000000000000000000000bb",
          },
        },
      })
    ).toEqual({
      title: "New budget proposed in Alpha.",
      excerpt: "0x0000...00aa opened a new budget request.",
      href: "/0x00000000000000000000000000000000000000bb/events",
      actorName: "0x0000...00aa",
    });
  });

  it("falls back to generic protocol copy when payload labels are missing", () => {
    expect(
      buildProtocolNotificationPresentation({
        reason: "goal_expired",
        actorWalletAddress: null,
        payload: null,
      })
    ).toEqual({
      title: "Goal expired.",
      excerpt: "The goal reached an expired terminal state.",
      href: "/notifications",
      actorName: null,
    });
  });
});
