import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

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

import { getAllocateIntroDismissed, setAllocateIntroDismissed } from "./allocate-intro";

describe("allocate intro kv", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns false when goal address is empty", async () => {
    const result = await getAllocateIntroDismissed("0xAbC", "   ");
    expect(result).toBe(false);
    expect(getMock).not.toHaveBeenCalled();
  });

  it("returns true when intro is marked dismissed", async () => {
    getMock.mockResolvedValueOnce("1");

    const result = await getAllocateIntroDismissed("0xAbC", "Raise-1-Mil");

    expect(getMock).toHaveBeenCalledWith("allocate:intro:dismissed:0xabc:raise-1-mil");
    expect(result).toBe(true);
  });

  it("returns false when kv get fails", async () => {
    getMock.mockRejectedValueOnce(new Error("boom"));

    const result = await getAllocateIntroDismissed("0xAbC", "raise-1-mil");

    expect(result).toBe(false);
  });

  it("stores a dismissal key for the user and goal", async () => {
    setMock.mockResolvedValueOnce("OK");

    const result = await setAllocateIntroDismissed("0xAbC", "Raise-1-Mil");

    expect(setMock).toHaveBeenCalledWith("allocate:intro:dismissed:0xabc:raise-1-mil", "1");
    expect(result).toBe(true);
  });

  it("returns false when goal is invalid on set", async () => {
    const result = await setAllocateIntroDismissed("0xAbC", "");

    expect(result).toBe(false);
    expect(setMock).not.toHaveBeenCalled();
  });

  it("returns false when kv set fails", async () => {
    setMock.mockRejectedValueOnce(new Error("boom"));

    const result = await setAllocateIntroDismissed("0xAbC", "raise-1-mil");

    expect(result).toBe(false);
  });
});
