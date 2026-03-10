import { describe, expect, it } from "vitest";
import { buildProtocolNotificationPresentation } from "./presentation";

describe("protocol notification presentation", () => {
  const goalTreasury = "0x00000000000000000000000000000000000000bb";

  it("builds proposer-specific budget proposal copy and events path", () => {
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
      href: "/0x00000000000000000000000000000000000000bb/events",
      actorName: "0x0000...00aa",
    });
  });

  it("builds requester-specific removal challenge copy", () => {
    expect(
      buildProtocolNotificationPresentation({
        reason: "budget_removal_challenged",
        actorWalletAddress: "0x00000000000000000000000000000000000000aa",
        payload: {
          role: "requester",
          labels: { goalName: "Alpha" },
          resource: {
            goalTreasury: "0x00000000000000000000000000000000000000bb",
          },
        },
      })
    ).toEqual({
      title: "Your removal request was challenged in Alpha.",
      excerpt: "0x0000...00aa challenged your removal request.",
      href: "/0x00000000000000000000000000000000000000bb/events",
      actorName: "0x0000...00aa",
    });
  });

  it("builds challenger-specific dispute copy", () => {
    expect(
      buildProtocolNotificationPresentation({
        reason: "budget_proposal_challenged",
        actorWalletAddress: "0x00000000000000000000000000000000000000aa",
        payload: {
          role: "challenger",
          labels: { goalName: "Alpha" },
          resource: {
            goalTreasury: "0x00000000000000000000000000000000000000bb",
          },
        },
      })
    ).toEqual({
      title: "You challenged a budget proposal in Alpha.",
      excerpt: "The budget proposal is now in dispute.",
      href: "/0x00000000000000000000000000000000000000bb/events",
      actorName: "0x0000...00aa",
    });
  });

  it.each([
    [
      "requester",
      "budget_accepted",
      "Your budget proposal was accepted.",
      "Governance accepted your proposal and queued it for activation.",
    ],
    [
      "proposer",
      "budget_removed",
      "Your budget was removed.",
      "Your budget was detached from active funding.",
    ],
    [
      "challenger",
      "budget_removal_challenged",
      "You challenged a budget removal request.",
      "The removal request is now in dispute.",
    ],
  ])("builds role-aware copy without goal labels for %s on %s", (role, reason, title, excerpt) => {
    expect(
      buildProtocolNotificationPresentation({
        reason,
        actorWalletAddress: null,
        payload: {
          role,
          labels: { goalName: "   " },
          resource: { goalTreasury: "not-an-address" },
        },
      })
    ).toEqual({
      title,
      excerpt,
      href: "/notifications",
      actorName: null,
    });
  });

  it.each([
    [
      "budget_proposed",
      "You proposed a new budget in Alpha.",
      "Your budget request entered governance.",
      "0x00000000000000000000000000000000000000aa",
      "Alpha",
    ],
    [
      "budget_proposal_challenged",
      "Your budget proposal was challenged.",
      "Your budget proposal moved into dispute.",
      null,
      "   ",
    ],
    [
      "budget_activated",
      "Your budget was activated in Alpha.",
      "Your budget is now active for funding.",
      "0x00000000000000000000000000000000000000aa",
      "Alpha",
    ],
    [
      "budget_removal_requested",
      "You requested budget removal in Alpha.",
      "Your removal request entered governance.",
      "0x00000000000000000000000000000000000000aa",
      "Alpha",
    ],
    [
      "budget_removal_accepted",
      "Your removal request was accepted.",
      "Governance accepted your removal request and queued final removal.",
      "0x00000000000000000000000000000000000000aa",
      "   ",
    ],
    [
      "mechanism_proposed",
      "You proposed a new allocation mechanism in Alpha.",
      "Your allocation mechanism request entered governance.",
      "0x00000000000000000000000000000000000000aa",
      "Alpha",
    ],
    [
      "mechanism_challenged",
      "Your allocation mechanism request was challenged.",
      "Your allocation mechanism request moved into dispute.",
      null,
      "   ",
    ],
    [
      "mechanism_accepted",
      "Your allocation mechanism request was accepted.",
      "Governance accepted your allocation mechanism request and queued it for activation.",
      null,
      "   ",
    ],
    [
      "mechanism_activated",
      "Your allocation mechanism was activated in Alpha.",
      "Your allocation mechanism is now active for allocations.",
      "0x00000000000000000000000000000000000000aa",
      "Alpha",
    ],
    [
      "mechanism_removal_requested",
      "You requested allocation mechanism removal in Alpha.",
      "Your allocation mechanism removal request entered governance.",
      "0x00000000000000000000000000000000000000aa",
      "Alpha",
    ],
    [
      "mechanism_removal_accepted",
      "Your allocation mechanism removal request was accepted.",
      "Governance accepted your allocation mechanism removal request and queued final removal.",
      null,
      "   ",
    ],
  ])(
    "builds requester-specific copy for %s",
    (reason, title, excerpt, actorWalletAddress, goalName) => {
      expect(
        buildProtocolNotificationPresentation({
          reason,
          actorWalletAddress,
          payload: {
            role: "requester",
            labels: { goalName },
            resource: { goalTreasury: goalName.trim() ? goalTreasury : "not-an-address" },
          },
        })
      ).toEqual({
        title,
        excerpt,
        href: goalName.trim() ? `/${goalTreasury}/events` : "/notifications",
        actorName: actorWalletAddress ? "0x0000...00aa" : null,
      });
    }
  );

  it.each([
    [
      "budget_proposal_challenged",
      "Your budget proposal was challenged.",
      "Your budget proposal moved into dispute.",
      null,
      "   ",
    ],
    [
      "budget_accepted",
      "Your budget proposal was accepted in Alpha.",
      "Governance accepted your proposal and queued it for activation.",
      "0x00000000000000000000000000000000000000aa",
      "Alpha",
    ],
    [
      "budget_activated",
      "Your budget was activated in Alpha.",
      "Your budget is now active for funding.",
      "0x00000000000000000000000000000000000000aa",
      "Alpha",
    ],
    [
      "budget_removal_challenged",
      "Removal request challenged for your budget.",
      "A removal request for your budget moved into dispute.",
      null,
      "   ",
    ],
    [
      "budget_removal_accepted",
      "Removal accepted for your budget.",
      "The removal request for your budget cleared governance and is queued for final removal.",
      "0x00000000000000000000000000000000000000aa",
      "   ",
    ],
    [
      "mechanism_proposed",
      "You proposed a new allocation mechanism in Alpha.",
      "Your allocation mechanism request entered governance.",
      "0x00000000000000000000000000000000000000aa",
      "Alpha",
    ],
    [
      "mechanism_challenged",
      "Your allocation mechanism request was challenged in Alpha.",
      "0x0000...00aa challenged your allocation mechanism request.",
      "0x00000000000000000000000000000000000000aa",
      "Alpha",
    ],
    [
      "mechanism_accepted",
      "Your allocation mechanism request was accepted.",
      "Governance accepted your allocation mechanism request and queued it for activation.",
      null,
      "   ",
    ],
    [
      "mechanism_activated",
      "Your allocation mechanism was activated in Alpha.",
      "Your allocation mechanism is now active for allocations.",
      "0x00000000000000000000000000000000000000aa",
      "Alpha",
    ],
    [
      "mechanism_removed",
      "Your allocation mechanism was removed.",
      "Your allocation mechanism was detached from active allocation.",
      null,
      "   ",
    ],
    [
      "mechanism_removal_requested",
      "Removal requested for your allocation mechanism in Alpha.",
      "A removal request was submitted for your allocation mechanism.",
      null,
      "Alpha",
    ],
    [
      "mechanism_removal_accepted",
      "Removal accepted for your allocation mechanism.",
      "The removal request for your allocation mechanism cleared governance and is queued for final removal.",
      null,
      "   ",
    ],
  ])(
    "builds proposer-specific copy for %s",
    (reason, title, excerpt, actorWalletAddress, goalName) => {
      expect(
        buildProtocolNotificationPresentation({
          reason,
          actorWalletAddress,
          payload: {
            role: "proposer",
            labels: { goalName },
            resource: { goalTreasury: goalName.trim() ? goalTreasury : "not-an-address" },
          },
        })
      ).toEqual({
        title,
        excerpt,
        href: goalName.trim() ? `/${goalTreasury}/events` : "/notifications",
        actorName: actorWalletAddress ? "0x0000...00aa" : null,
      });
    }
  );

  it("builds proposer-specific challenge copy with an actor label", () => {
    expect(
      buildProtocolNotificationPresentation({
        reason: "budget_proposal_challenged",
        actorWalletAddress: "0x00000000000000000000000000000000000000aa",
        payload: {
          role: "proposer",
          labels: { goalName: "Alpha" },
          resource: { goalTreasury },
        },
      })
    ).toEqual({
      title: "Your budget proposal was challenged in Alpha.",
      excerpt: "0x0000...00aa challenged your budget proposal.",
      href: `/${goalTreasury}/events`,
      actorName: "0x0000...00aa",
    });
  });

  it("builds proposer-specific removal-request copy without an actor label", () => {
    expect(
      buildProtocolNotificationPresentation({
        reason: "budget_removal_requested",
        actorWalletAddress: null,
        payload: {
          role: "proposer",
          labels: { goalName: "Alpha" },
          resource: { goalTreasury },
        },
      })
    ).toEqual({
      title: "Removal requested for your budget in Alpha.",
      excerpt: "A removal request was submitted for your budget.",
      href: `/${goalTreasury}/events`,
      actorName: null,
    });
  });

  it("builds proposer-specific removal challenge copy with an actor label", () => {
    expect(
      buildProtocolNotificationPresentation({
        reason: "budget_removal_challenged",
        actorWalletAddress: "0x00000000000000000000000000000000000000aa",
        payload: {
          role: "proposer",
          labels: { goalName: "Alpha" },
          resource: { goalTreasury },
        },
      })
    ).toEqual({
      title: "Removal request challenged for your budget in Alpha.",
      excerpt: "0x0000...00aa challenged a removal request for your budget.",
      href: `/${goalTreasury}/events`,
      actorName: "0x0000...00aa",
    });
  });

  it("builds challenger-specific mechanism dispute copy", () => {
    expect(
      buildProtocolNotificationPresentation({
        reason: "mechanism_challenged",
        actorWalletAddress: "0x00000000000000000000000000000000000000aa",
        payload: {
          role: "challenger",
          labels: { goalName: "Alpha" },
          resource: { goalTreasury },
        },
      })
    ).toEqual({
      title: "You challenged an allocation mechanism request in Alpha.",
      excerpt: "The allocation mechanism request is now in dispute.",
      href: `/${goalTreasury}/events`,
      actorName: "0x0000...00aa",
    });
  });

  it("falls back to generic copy for challenger roles on non-dispute reasons", () => {
    expect(
      buildProtocolNotificationPresentation({
        reason: "budget_accepted",
        actorWalletAddress: "0x00000000000000000000000000000000000000aa",
        payload: {
          role: "challenger",
          labels: { goalName: "Alpha" },
          resource: { goalTreasury },
        },
      })
    ).toEqual({
      title: "Budget accepted in Alpha.",
      excerpt: "The proposal cleared governance and is queued for activation.",
      href: `/${goalTreasury}/events`,
      actorName: "0x0000...00aa",
    });
  });

  it.each(["requester", "proposer"])(
    "falls back to generic copy for %s roles on non-request reasons",
    (role) => {
      expect(
        buildProtocolNotificationPresentation({
          reason: "goal_active",
          actorWalletAddress: "0x00000000000000000000000000000000000000aa",
          payload: {
            role,
            labels: { goalName: "Alpha" },
            resource: { goalTreasury },
          },
        })
      ).toEqual({
        title: "Alpha is now active.",
        excerpt: "The goal has moved from funding into the active phase.",
        href: `/${goalTreasury}/events`,
        actorName: "0x0000...00aa",
      });
    }
  );

  it.each(["goal_owner", "goal_stakeholder", "goal_underwriter", "budget_underwriter", "juror"])(
    "parses %s as a recognized role and falls back to generic copy",
    (role) => {
      expect(
        buildProtocolNotificationPresentation({
          reason: "budget_activated",
          actorWalletAddress: null,
          payload: {
            role,
            labels: { goalName: "Alpha" },
            resource: { goalTreasury },
          },
        })
      ).toEqual({
        title: "Budget activated in Alpha.",
        excerpt: "The budget is now active for funding.",
        href: `/${goalTreasury}/events`,
        actorName: null,
      });
    }
  );

  it("builds juror copy for phase-open notifications", () => {
    expect(
      buildProtocolNotificationPresentation({
        reason: "juror_voting_open",
        actorWalletAddress: null,
        payload: {
          labels: { goalName: "Alpha" },
          resource: {
            goalTreasury: "0x00000000000000000000000000000000000000bb",
          },
        },
      })
    ).toEqual({
      title: "Juror voting opened in Alpha.",
      excerpt: "Voting is now open on this dispute.",
      href: "/0x00000000000000000000000000000000000000bb/events",
      actorName: null,
    });
  });

  it("builds underwriter slash copy", () => {
    expect(
      buildProtocolNotificationPresentation({
        reason: "underwriter_slashed",
        actorWalletAddress: null,
        payload: {
          labels: { goalName: "Alpha" },
          resource: {
            goalTreasury: "0x00000000000000000000000000000000000000bb",
          },
        },
      })
    ).toEqual({
      title: "Underwriter slash applied in Alpha.",
      excerpt: "A slash was applied to your underwriting position.",
      href: "/0x00000000000000000000000000000000000000bb/events",
      actorName: null,
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

  it.each([
    [
      "budget_proposal_challenged",
      "Budget proposal challenged in Alpha.",
      "A budget request moved into dispute.",
    ],
    [
      "budget_accepted",
      "Budget accepted in Alpha.",
      "The proposal cleared governance and is queued for activation.",
    ],
    ["budget_activated", "Budget activated in Alpha.", "The budget is now active for funding."],
    [
      "budget_removal_requested",
      "Budget removal requested in Alpha.",
      "A removal request was submitted for this budget.",
    ],
    [
      "budget_removal_challenged",
      "Budget removal challenged in Alpha.",
      "The removal request moved into dispute.",
    ],
    [
      "budget_removal_accepted",
      "Budget removal accepted in Alpha.",
      "The removal request cleared governance and is queued for final removal.",
    ],
    ["budget_removed", "Budget removed in Alpha.", "The budget was detached from active funding."],
    [
      "budget_active",
      "Budget in Alpha is now active.",
      "This budget entered the active funding phase.",
    ],
    [
      "budget_succeeded",
      "Budget in Alpha succeeded.",
      "This budget reached a succeeded terminal state.",
    ],
    ["budget_failed", "Budget in Alpha failed.", "This budget reached a failed terminal state."],
    [
      "budget_expired",
      "Budget in Alpha expired.",
      "This budget reached an expired terminal state.",
    ],
    [
      "mechanism_proposed",
      "New allocation mechanism proposed in Alpha.",
      "A new allocation mechanism request entered governance.",
    ],
    [
      "mechanism_challenged",
      "Allocation mechanism request challenged in Alpha.",
      "An allocation mechanism request moved into dispute.",
    ],
    [
      "mechanism_accepted",
      "Allocation mechanism accepted in Alpha.",
      "The allocation mechanism request cleared governance and is queued for activation.",
    ],
    [
      "mechanism_activated",
      "Allocation mechanism activated in Alpha.",
      "The allocation mechanism is now active for allocations.",
    ],
    [
      "mechanism_removal_requested",
      "Allocation mechanism removal requested in Alpha.",
      "A removal request was submitted for this allocation mechanism.",
    ],
    [
      "mechanism_removal_accepted",
      "Allocation mechanism removal accepted in Alpha.",
      "The allocation mechanism removal request cleared governance and is queued for final removal.",
    ],
    [
      "mechanism_removed",
      "Allocation mechanism removed in Alpha.",
      "The allocation mechanism was detached from active allocation.",
    ],
    [
      "goal_active",
      "Alpha is now active.",
      "The goal has moved from funding into the active phase.",
    ],
    ["goal_succeeded", "Alpha succeeded.", "The goal reached a succeeded terminal state."],
    ["goal_expired", "Alpha expired.", "The goal reached an expired terminal state."],
    [
      "juror_dispute_created",
      "New juror dispute in Alpha.",
      "A new dispute is waiting for juror attention.",
    ],
    [
      "juror_ruling_final",
      "Juror ruling finalized in Alpha.",
      "The dispute finished with a final ruling.",
    ],
    [
      "juror_slashable",
      "Juror slash risk in Alpha.",
      "The dispute resolved in a way that may leave your juror stake slashable.",
    ],
    ["juror_slashed", "Juror slashed in Alpha.", "A slash was applied to your juror stake."],
  ])("builds titled protocol copy for %s", (reason, title, excerpt) => {
    expect(
      buildProtocolNotificationPresentation({
        reason,
        actorWalletAddress: null,
        payload: {
          labels: { goalName: "Alpha" },
          resource: {
            goalTreasury,
          },
        },
      })
    ).toEqual({
      title,
      excerpt,
      href: `/${goalTreasury}/events`,
      actorName: null,
    });
  });

  it("falls back to generic updates for unknown reasons while keeping the goal path", () => {
    expect(
      buildProtocolNotificationPresentation({
        reason: "something_new",
        actorWalletAddress: null,
        payload: {
          labels: { goalName: "Alpha" },
          resource: {
            goalTreasury,
          },
        },
      })
    ).toEqual({
      title: "Protocol update for Alpha.",
      excerpt: null,
      href: `/${goalTreasury}/events`,
      actorName: null,
    });
  });

  it("falls back to generic request copy when payload role is unknown", () => {
    expect(
      buildProtocolNotificationPresentation({
        reason: "budget_proposed",
        actorWalletAddress: "0x00000000000000000000000000000000000000aa",
        payload: {
          role: "someone_else",
          labels: { goalName: "Alpha" },
          resource: {
            goalTreasury,
          },
        },
      })
    ).toEqual({
      title: "New budget proposed in Alpha.",
      excerpt: "0x0000...00aa opened a new budget request.",
      href: `/${goalTreasury}/events`,
      actorName: "0x0000...00aa",
    });
  });
});
