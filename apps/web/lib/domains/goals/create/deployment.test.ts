import { beforeEach, describe, expect, it, vi } from "vitest";
import { extractCreateGoalDeploymentState } from "./deployment";

const decodeGoalDeployedEventMock = vi.fn();

vi.mock("@cobuild/wire", () => ({
  decodeGoalDeployedEvent: (...args: unknown[]) => decodeGoalDeployedEventMock(...args),
}));

describe("extractCreateGoalDeploymentState", () => {
  beforeEach(() => {
    decodeGoalDeployedEventMock.mockReset();
  });

  it("returns normalized deployment addresses and revnet id", () => {
    decodeGoalDeployedEventMock.mockReturnValue({
      stack: {
        goalTreasury: "0x00000000000000000000000000000000000000AB",
        goalFlow: "0x00000000000000000000000000000000000000cd",
        goalRevnetId: 138n,
      },
    });

    expect(extractCreateGoalDeploymentState("0xhash", [])).toEqual({
      txHash: "0xhash",
      goalTreasury: "0x00000000000000000000000000000000000000ab",
      goalFlow: "0x00000000000000000000000000000000000000cd",
      goalRevnetId: "138",
    });
  });

  it("drops invalid or missing stack values", () => {
    decodeGoalDeployedEventMock.mockReturnValue({
      stack: {
        goalTreasury: "not-an-address",
        goalFlow: 123,
        goalRevnetId: "138",
      },
    });

    expect(extractCreateGoalDeploymentState("0xhash", [])).toEqual({
      txHash: "0xhash",
      goalTreasury: undefined,
      goalFlow: undefined,
      goalRevnetId: undefined,
    });

    decodeGoalDeployedEventMock.mockReturnValue(undefined);

    expect(extractCreateGoalDeploymentState("0xhash-2", [])).toEqual({
      txHash: "0xhash-2",
      goalTreasury: undefined,
      goalFlow: undefined,
      goalRevnetId: undefined,
    });
  });
});
