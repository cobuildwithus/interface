import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { getLinkedAccountsByAddress } = vi.hoisted(() => ({
  getLinkedAccountsByAddress: vi.fn(),
}));

vi.mock("@/lib/domains/auth/linked-accounts/store", () => ({
  getLinkedAccountsByAddress,
}));

import { getLinkedAccountsResponse } from "./linked-accounts-response";

describe("getLinkedAccountsResponse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty response when address missing", async () => {
    const result = await getLinkedAccountsResponse(null);
    expect(result).toEqual({ address: null, accounts: [] });
  });

  it("returns linked accounts for address", async () => {
    getLinkedAccountsByAddress.mockResolvedValueOnce([{ platform: "x" }]);
    const result = await getLinkedAccountsResponse("0xabc", { usePrimary: true });
    expect(getLinkedAccountsByAddress).toHaveBeenCalledWith("0xabc", { usePrimary: true });
    expect(result).toEqual({ address: "0xabc", accounts: [{ platform: "x" }] });
  });
});
