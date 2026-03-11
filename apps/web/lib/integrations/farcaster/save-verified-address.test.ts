import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { persistFarcasterWalletLink } = vi.hoisted(() => ({
  persistFarcasterWalletLink: vi.fn(),
}));

vi.mock("@/lib/integrations/farcaster/persist-wallet-link", () => ({
  persistFarcasterWalletLink: (...args: unknown[]) => persistFarcasterWalletLink(...args),
}));

import { saveVerifiedAddressForFid } from "./save-verified-address";

describe("saveVerifiedAddressForFid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates to the shared Farcaster wallet-link persistence helper", async () => {
    await saveVerifiedAddressForFid(123, "0xdef");

    expect(persistFarcasterWalletLink).toHaveBeenCalledWith(123, "0xdef");
  });
});
