import { beforeEach, describe, expect, it, vi } from "vitest";
import type { unstable_cache as unstableCache } from "next/cache";

vi.mock("server-only", () => ({}));
const { passthroughCache } = vi.hoisted(() => ({
  passthroughCache: ((fn) => fn) as typeof unstableCache,
}));
vi.mock("next/cache", () => ({ unstable_cache: passthroughCache }));

const { getMock, setMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  setMock: vi.fn(),
}));

vi.mock("@vercel/kv", () => ({
  kv: {
    get: getMock,
    set: setMock,
  },
}));

import { getGoalActionCardReadIndices, setGoalActionCardRead } from "./action-card-read";

const GOAL_ACTION_CARD_READ_KEY = "goal:action-card:read:0xabc:raise-1-mil";

describe("goal action card read kv", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty indices when goal address is invalid", async () => {
    const result = await getGoalActionCardReadIndices("0xAbC", "  ");

    expect(result).toEqual([]);
    expect(getMock).not.toHaveBeenCalled();
  });

  it("returns normalized stored indices from array values", async () => {
    getMock.mockResolvedValueOnce([3, 1, 3, -1, 2.5]);

    const result = await getGoalActionCardReadIndices("0xAbC", "Raise-1-Mil");

    expect(getMock).toHaveBeenCalledWith(GOAL_ACTION_CARD_READ_KEY);
    expect(result).toEqual([1, 3]);
  });

  it("returns normalized stored indices from json string values", async () => {
    getMock.mockResolvedValueOnce("[4,2,2]");

    const result = await getGoalActionCardReadIndices("0xAbC", "raise-1-mil");

    expect(result).toEqual([2, 4]);
  });

  it("returns empty indices when kv get fails", async () => {
    getMock.mockRejectedValueOnce(new Error("boom"));

    const result = await getGoalActionCardReadIndices("0xAbC", "raise-1-mil");

    expect(result).toEqual([]);
  });

  it("sets a new read index", async () => {
    getMock.mockResolvedValueOnce(null);
    setMock.mockResolvedValueOnce("OK");

    const result = await setGoalActionCardRead("0xAbC", "Raise-1-Mil", 2);

    expect(result).toBe(true);
    expect(setMock).toHaveBeenCalledWith(GOAL_ACTION_CARD_READ_KEY, [2]);
  });

  it("merges with existing indices and keeps them unique", async () => {
    getMock.mockResolvedValueOnce([1, 4]);
    setMock.mockResolvedValueOnce("OK");

    const result = await setGoalActionCardRead("0xAbC", "raise-1-mil", 1);

    expect(result).toBe(true);
    expect(setMock).toHaveBeenCalledWith(GOAL_ACTION_CARD_READ_KEY, [1, 4]);
  });

  it("returns false when card index is invalid", async () => {
    const result = await setGoalActionCardRead("0xAbC", "raise-1-mil", -1);

    expect(result).toBe(false);
    expect(getMock).not.toHaveBeenCalled();
    expect(setMock).not.toHaveBeenCalled();
  });

  it("returns false when kv set fails", async () => {
    getMock.mockResolvedValueOnce([0]);
    setMock.mockRejectedValueOnce(new Error("boom"));

    const result = await setGoalActionCardRead("0xAbC", "raise-1-mil", 1);

    expect(result).toBe(false);
  });
});
