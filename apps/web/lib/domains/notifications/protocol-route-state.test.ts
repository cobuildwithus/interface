import { describe, expect, it } from "vitest";
import {
  buildProtocolRouteHint,
  resolveProtocolRouteState,
} from "@cobuild/wire/protocol-notifications";

describe("protocol route state", () => {
  it("normalizes structured notification route refs", () => {
    expect(
      resolveProtocolRouteState({
        focus: "mechanism",
        budgetTreasury: "0x00000000000000000000000000000000000000CC",
        itemId: "0x1111111111111111111111111111111111111111111111111111111111111111",
        requestIndex: "3",
        disputeId: "7",
        arbitrator: "0x00000000000000000000000000000000000000DD",
      })
    ).toEqual({
      focus: "mechanism",
      budgetTreasury: "0x00000000000000000000000000000000000000cc",
      itemId: "0x1111111111111111111111111111111111111111111111111111111111111111",
      requestIndex: "3",
      disputeId: "7",
      arbitrator: "0x00000000000000000000000000000000000000dd",
    });
  });

  it("builds allocate hints with actionable chips and focus sections", () => {
    const hint = buildProtocolRouteHint("allocate", {
      focus: "premium",
      budgetTreasury: "0x00000000000000000000000000000000000000cc",
      itemId: null,
      requestIndex: null,
      disputeId: null,
      arbitrator: null,
    });

    expect(hint).toEqual({
      title: "Focused premium activity",
      description: "This notification points to premium claim state for an underwriting position.",
      chips: [
        {
          label: "Budget",
          value: "0x0000...00cc",
        },
      ],
      focusSectionId: "position-summary",
    });
  });

  it("builds event hints for dispute-focused links", () => {
    const hint = buildProtocolRouteHint("events", {
      focus: "dispute",
      budgetTreasury: null,
      itemId: null,
      requestIndex: "2",
      disputeId: "9",
      arbitrator: "0x00000000000000000000000000000000000000dd",
    });

    expect(hint).toEqual({
      title: "Focused dispute context",
      description: "This notification references a challenged request or juror dispute.",
      chips: [
        {
          label: "Request",
          value: "#2",
        },
        {
          label: "Dispute",
          value: "#9",
        },
        {
          label: "Arbitrator",
          value: "0x0000...00dd",
        },
      ],
      focusSectionId: null,
    });
  });
});
