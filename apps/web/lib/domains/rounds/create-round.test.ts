import { describe, expect, it } from "vitest";
import {
  buildCreateRoundPayload,
  parseCreateRoundPayload,
  validateCreateRoundStep,
  type CreateRoundFormData,
} from "./create-round";

function buildFormData(overrides: Partial<CreateRoundFormData> = {}): CreateRoundFormData {
  return {
    title: "Weekly Art Challenge",
    prompt: "Which post is best?",
    description: "Share your latest work.",
    castTemplate: "My entry",
    clausesDraft: {
      farcaster: [{ id: "fc-1", type: "mentionsAll", raw: "dwr.eth" }],
      x: [],
    },
    requirementsText: "Must include original art",
    perUserLimit: 2,
    status: "open",
    variant: "ideas",
    startAt: new Date("2025-01-01T00:00:00.000Z"),
    endAt: new Date("2025-01-31T00:00:00.000Z"),
    ...overrides,
  };
}

describe("create-round domain helpers", () => {
  it("builds a normalized payload from dialog form data", () => {
    const result = buildCreateRoundPayload(buildFormData());

    expect(result).toEqual({
      ok: true,
      value: {
        title: "Weekly Art Challenge",
        prompt: "Which post is best?",
        description: "Share your latest work.",
        castTemplate: "My entry",
        clauses: {
          farcaster: [{ type: "mentionsAll", usernames: ["dwr.eth"] }],
          x: [],
        },
        requirementsText: "Must include original art",
        perUserLimit: 2,
        status: "open",
        variant: "ideas",
        startAt: "2025-01-01T00:00:00.000Z",
        endAt: "2025-01-31T00:00:00.000Z",
      },
    });
  });

  it("shares the step-three date-range validation message", () => {
    const result = validateCreateRoundStep(
      3,
      buildFormData({
        startAt: new Date("2025-02-01T00:00:00.000Z"),
        endAt: new Date("2025-01-31T00:00:00.000Z"),
      })
    );

    expect(result).toEqual({
      ok: false,
      error: "End date must be on or after start date.",
    });
  });

  it("parses date-only payload values for the server action", () => {
    const result = parseCreateRoundPayload({
      title: "Date-only Round",
      prompt: "Which post is best?",
      description: "Short summary",
      castTemplate: "",
      requirementsText: "Must be good",
      perUserLimit: 1,
      status: "open",
      variant: "default",
      clauses: { farcaster: [], x: [] },
      startAt: "2025-01-01",
      endAt: "2025-01-31",
    });

    expect(result).toEqual({
      ok: true,
      data: expect.objectContaining({
        startAt: "2025-01-01",
        endAt: "2025-01-31",
      }),
      startAt: new Date("2025-01-01T00:00:00.000Z"),
      endAt: new Date("2025-01-31T00:00:00.000Z"),
    });
  });
});
