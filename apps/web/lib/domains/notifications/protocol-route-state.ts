type RawSearchParams = Record<string, string | string[] | undefined>;

export type ProtocolRouteFocus =
  | "request"
  | "dispute"
  | "budget"
  | "mechanism"
  | "goal"
  | "success_assertion"
  | "underwriter"
  | "premium";

export type ProtocolRouteState = {
  focus: ProtocolRouteFocus | null;
  budgetTreasury: string | null;
  itemId: string | null;
  requestIndex: string | null;
  disputeId: string | null;
  arbitrator: string | null;
};

export type ProtocolRouteHint = {
  title: string;
  description: string;
  chips: Array<{ label: string; value: string }>;
  focusSectionId: "position-summary" | "funding-flow" | null;
};

const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;
const HEX_PATTERN = /^0x[0-9a-fA-F]+$/;
const INTEGER_PATTERN = /^[0-9]+$/;

function takeFirst(value: string | string[] | undefined): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }
  if (Array.isArray(value)) {
    return takeFirst(value[0]);
  }
  return null;
}

function normalizeAddress(value: string | null): string | null {
  return value && ADDRESS_PATTERN.test(value) ? value.toLowerCase() : null;
}

function normalizeHex(value: string | null): string | null {
  return value && HEX_PATTERN.test(value) ? value.toLowerCase() : null;
}

function normalizeInteger(value: string | null): string | null {
  return value && INTEGER_PATTERN.test(value) ? value : null;
}

function normalizeFocus(value: string | null): ProtocolRouteFocus | null {
  switch (value) {
    case "request":
    case "dispute":
    case "budget":
    case "mechanism":
    case "goal":
    case "success_assertion":
    case "underwriter":
    case "premium":
      return value;
    default:
      return null;
  }
}

function shortenHex(value: string | null): string | null {
  if (!value) return null;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function buildHintCopy(
  page: "events" | "allocate",
  focus: ProtocolRouteFocus
): Omit<ProtocolRouteHint, "chips"> {
  if (page === "events") {
    switch (focus) {
      case "request":
        return {
          title: "Focused governance request",
          description: "This notification points to a specific request cycle for this goal.",
          focusSectionId: null,
        };
      case "dispute":
        return {
          title: "Focused dispute context",
          description: "This notification references a challenged request or juror dispute.",
          focusSectionId: null,
        };
      case "success_assertion":
        return {
          title: "Focused success assertion update",
          description:
            "This notification references a goal-level success assertion lifecycle event.",
          focusSectionId: null,
        };
      case "goal":
      default:
        return {
          title: "Focused goal update",
          description: "This notification points to a goal-wide lifecycle transition.",
          focusSectionId: null,
        };
    }
  }

  switch (focus) {
    case "mechanism":
      return {
        title: "Focused allocation mechanism",
        description: "This notification points to an allocation mechanism lifecycle update.",
        focusSectionId: "funding-flow",
      };
    case "success_assertion":
      return {
        title: "Focused success assertion update",
        description: "This notification points to a budget success-assertion lifecycle update.",
        focusSectionId: "funding-flow",
      };
    case "underwriter":
      return {
        title: "Focused underwriter action",
        description: "This notification points to an underwriting action or slash event.",
        focusSectionId: "position-summary",
      };
    case "premium":
      return {
        title: "Focused premium activity",
        description:
          "This notification points to premium claim state for an underwriting position.",
        focusSectionId: "position-summary",
      };
    case "budget":
    default:
      return {
        title: "Focused budget context",
        description: "This notification points to a budget lifecycle update in the allocate view.",
        focusSectionId: "funding-flow",
      };
  }
}

export function resolveProtocolRouteState(searchParams: RawSearchParams): ProtocolRouteState {
  return {
    focus: normalizeFocus(takeFirst(searchParams.focus)),
    budgetTreasury: normalizeAddress(takeFirst(searchParams.budgetTreasury)),
    itemId: normalizeHex(takeFirst(searchParams.itemId)),
    requestIndex: normalizeInteger(takeFirst(searchParams.requestIndex)),
    disputeId: normalizeInteger(takeFirst(searchParams.disputeId)),
    arbitrator: normalizeAddress(takeFirst(searchParams.arbitrator)),
  };
}

export function buildProtocolRouteHint(
  page: "events" | "allocate",
  state: ProtocolRouteState
): ProtocolRouteHint | null {
  if (!state.focus) return null;

  const hint = buildHintCopy(page, state.focus);
  const chips = [
    state.budgetTreasury
      ? {
          label: "Budget",
          value: shortenHex(state.budgetTreasury) ?? state.budgetTreasury,
        }
      : null,
    state.itemId
      ? {
          label: "Item",
          value: shortenHex(state.itemId) ?? state.itemId,
        }
      : null,
    state.requestIndex
      ? {
          label: "Request",
          value: `#${state.requestIndex}`,
        }
      : null,
    state.disputeId
      ? {
          label: "Dispute",
          value: `#${state.disputeId}`,
        }
      : null,
    state.arbitrator
      ? {
          label: "Arbitrator",
          value: shortenHex(state.arbitrator) ?? state.arbitrator,
        }
      : null,
  ].filter((value): value is { label: string; value: string } => value !== null);

  return {
    ...hint,
    chips,
  };
}
