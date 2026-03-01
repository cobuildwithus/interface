/**
 * @vitest-environment happy-dom
 */
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { RoundSubmission } from "@/types/round-submission";
import { RoundSubmissions } from "./round-submissions";

const {
  getSubmissionsByRoundWithAiOutputsMock,
  getIntentStatsByEntityIdMock,
  isAdminForMock,
  roundSubmissionsClientMock,
} = vi.hoisted(() => ({
  getSubmissionsByRoundWithAiOutputsMock: vi.fn(),
  getIntentStatsByEntityIdMock: vi.fn(),
  isAdminForMock: vi.fn(),
  roundSubmissionsClientMock: vi.fn(),
}));

vi.mock("@/lib/domains/rounds/submissions", () => ({
  getSubmissionsByRoundWithAiOutputs: (roundId: string) =>
    getSubmissionsByRoundWithAiOutputsMock(roundId),
}));

vi.mock("@/lib/domains/token/intent-stats/intent-stats", () => ({
  getIntentStatsByEntityId: (params: { entityIds: string[]; roundEntityIds: string[] }) =>
    getIntentStatsByEntityIdMock(params),
}));

vi.mock("@/lib/config/admins", () => ({
  isAdminFor: (userAddress: `0x${string}` | undefined, admins: string[]) =>
    isAdminForMock(userAddress, admins),
}));

vi.mock("./round-submissions-client", () => ({
  RoundSubmissionsClient: (props: unknown) => {
    roundSubmissionsClientMock(props);
    return <div data-testid="round-submissions-client" />;
  },
}));

const baseSubmission: RoundSubmission = {
  source: "farcaster",
  postId: "0x1",
  entityId: "0x1",
  url: null,
  createdAt: null,
  aiTitle: null,
  aiCategory: null,
  authorHandle: null,
  authorDisplayName: null,
  authorAvatarUrl: null,
  rawText: null,
  displayText: null,
  mediaUrls: undefined,
  handle: "alice",
  displayName: "Alice",
  avatarUrl: null,
  summaryText: "Submission",
  beneficiaryAddress: null,
  evalScore: null,
  aiOutput: null,
};

describe("RoundSubmissions", () => {
  beforeEach(() => {
    getSubmissionsByRoundWithAiOutputsMock.mockReset();
    getIntentStatsByEntityIdMock.mockReset();
    isAdminForMock.mockReset();
    roundSubmissionsClientMock.mockReset();
  });

  it("renders empty state and skips downstream lookups when no submissions exist", async () => {
    getSubmissionsByRoundWithAiOutputsMock.mockResolvedValue({
      submissions: [],
      roundEntityIds: [],
    });

    const ui = await RoundSubmissions({
      ruleId: 7,
      roundId: "42",
      admins: [],
      userAddress: undefined,
      variant: "default",
    });

    render(ui);

    expect(screen.getByText("No submissions yet")).toBeInTheDocument();
    expect(getSubmissionsByRoundWithAiOutputsMock).toHaveBeenCalledTimes(1);
    expect(getSubmissionsByRoundWithAiOutputsMock.mock.calls[0]).toEqual(["42"]);
    expect(getIntentStatsByEntityIdMock).not.toHaveBeenCalled();
    expect(isAdminForMock).not.toHaveBeenCalled();
    expect(roundSubmissionsClientMock).not.toHaveBeenCalled();
  });

  it("forwards submissions, intent stats, and admin state to client renderer", async () => {
    const submissions: RoundSubmission[] = [
      { ...baseSubmission, postId: "0x1", entityId: "0x1" },
      { ...baseSubmission, postId: "0x2", entityId: "0x2" },
    ];
    const intentStatsByEntityId = {
      "0x1": {
        backersCount: 2,
        totalBackersCount: 3,
        raisedUsdc: 12.5,
        qfMatchUsd: 4.25,
      },
    };

    getSubmissionsByRoundWithAiOutputsMock.mockResolvedValue({
      submissions,
      roundEntityIds: ["0x1", "0x2", "0x3"],
    });
    getIntentStatsByEntityIdMock.mockResolvedValue(intentStatsByEntityId);
    isAdminForMock.mockReturnValue(true);

    const userAddress = `0x${"1".repeat(40)}` as const;
    const admins = [userAddress];
    const ui = await RoundSubmissions({
      ruleId: 11,
      roundId: "99",
      admins,
      userAddress,
      variant: "ideas",
    });

    render(ui);

    expect(screen.getByTestId("round-submissions-client")).toBeInTheDocument();
    expect(getSubmissionsByRoundWithAiOutputsMock).toHaveBeenCalledTimes(1);
    expect(getSubmissionsByRoundWithAiOutputsMock.mock.calls[0]).toEqual(["99"]);
    expect(getIntentStatsByEntityIdMock).toHaveBeenCalledWith({
      entityIds: ["0x1", "0x2"],
      roundEntityIds: ["0x1", "0x2", "0x3"],
    });
    expect(isAdminForMock).toHaveBeenCalledWith(userAddress, admins);
    expect(roundSubmissionsClientMock).toHaveBeenCalledWith({
      submissions,
      intentStatsByEntityId,
      isAdmin: true,
      ruleId: 11,
      roundId: "99",
      variant: "ideas",
    });
  });
});
