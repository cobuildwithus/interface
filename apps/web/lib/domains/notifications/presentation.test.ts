import { describe, expect, it } from "vitest";
import { buildProtocolNotificationPresentation } from "@cobuild/wire/protocol-notifications";

describe("protocol notification presentation contract", () => {
  it("builds the shared app path directly", () => {
    expect(
      buildProtocolNotificationPresentation({
        reason: "budget_proposed",
        actorWalletAddress: "0x00000000000000000000000000000000000000aa",
        payload: {
          role: "proposer",
          labels: { goalName: "Alpha" },
          resource: {
            goalTreasury: "0x00000000000000000000000000000000000000bb",
          },
        },
      })
    ).toEqual({
      title: "You proposed a new budget in Alpha.",
      excerpt: "Your budget request entered governance.",
      appPath: "/0x00000000000000000000000000000000000000bb/events?focus=request",
      actorName: "0x0000...00aa",
    });
  });

  it("keeps the notifications fallback when no goal resource is present", () => {
    expect(
      buildProtocolNotificationPresentation({
        reason: "goal_expired",
        actorWalletAddress: null,
        payload: null,
      })
    ).toEqual({
      title: "Goal expired.",
      excerpt: "The goal reached an expired terminal state.",
      appPath: "/notifications",
      actorName: null,
    });
  });

  it("maps allocate-focused success assertion links from the shared presenter", () => {
    expect(
      buildProtocolNotificationPresentation({
        reason: "budget_success_assertion_registered",
        actorWalletAddress: null,
        payload: {
          role: "budget_controller",
          labels: { goalName: "Alpha" },
          resource: {
            goalTreasury: "0x00000000000000000000000000000000000000bb",
            budgetTreasury: "0x00000000000000000000000000000000000000cc",
          },
        },
      })
    ).toEqual({
      title: "Budget success assertion registered in Alpha.",
      excerpt: "A budget success assertion was registered and is awaiting resolution.",
      appPath:
        "/0x00000000000000000000000000000000000000bb/allocate?budgetTreasury=0x00000000000000000000000000000000000000cc&focus=success_assertion",
      actorName: null,
    });
  });
});
