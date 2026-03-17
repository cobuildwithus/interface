/**
 * @vitest-environment happy-dom
 */
import { render, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useUserMock = vi.hoisted(() => vi.fn());
const useAccountMock = vi.hoisted(() => vi.fn());
const logoutMock = vi.hoisted(() => vi.fn());
const toastErrorMock = vi.hoisted(() => vi.fn());

vi.mock("wagmi", () => ({
  useAccount: () => useAccountMock(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: toastErrorMock,
  },
}));

vi.mock("@/lib/hooks/use-user", () => ({
  useUser: () => useUserMock(),
}));

vi.mock("@/lib/domains/auth/use-login", () => ({
  useLogin: () => ({
    logout: logoutMock,
  }),
}));

import { WalletIdentityGuard } from "./wallet-identity-guard";

describe("WalletIdentityGuard", () => {
  beforeEach(() => {
    useUserMock.mockReset();
    useAccountMock.mockReset();
    logoutMock.mockReset();
    toastErrorMock.mockReset();

    useUserMock.mockReturnValue({ address: null });
    useAccountMock.mockReturnValue({ address: null });
    logoutMock.mockResolvedValue(undefined);
  });

  it("does not evaluate auth hooks during server render", () => {
    useUserMock.mockImplementation(() => {
      throw new Error("server render should not read session state");
    });
    useAccountMock.mockImplementation(() => {
      throw new Error("server render should not read wallet state");
    });

    const originalWindow = globalThis.window;

    vi.stubGlobal("window", undefined);

    try {
      expect(() => renderToString(<WalletIdentityGuard />)).not.toThrow();
    } finally {
      vi.stubGlobal("window", originalWindow);
    }
  });

  it("logs out after mount when the connected wallet no longer matches the session", async () => {
    useUserMock.mockReturnValue({ address: `0x${"a".repeat(40)}` });
    useAccountMock.mockReturnValue({ address: `0x${"b".repeat(40)}` });

    render(<WalletIdentityGuard />);

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith("Wallet changed. Please sign in again.");
      expect(logoutMock).toHaveBeenCalledTimes(1);
    });
  });
});
