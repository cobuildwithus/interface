/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import type { MouseEvent } from "react";

const useLoginMock = vi.fn();
vi.mock("@/lib/domains/auth/use-login", () => ({
  useLogin: () => useLoginMock(),
}));

import { useAuthClick } from "@/lib/domains/auth/use-auth-click";

describe("useAuthClick", () => {
  beforeEach(() => {
    useLoginMock.mockReset();
  });

  it("routes to login/connect based on auth state", () => {
    const login = vi.fn();
    const connectWallet = vi.fn();
    const onConnect = vi.fn();

    useLoginMock.mockReturnValue({
      login,
      connectWallet,
      authenticated: false,
      address: null,
    });

    const { result } = renderHook(() => useAuthClick(onConnect));
    const event = { preventDefault: vi.fn() } as Partial<
      MouseEvent<HTMLButtonElement>
    > as MouseEvent<HTMLButtonElement>;
    const ok = result.current.handleClick(event);

    expect(ok).toBe(false);
    expect(login).toHaveBeenCalled();
    expect(onConnect).toHaveBeenCalled();

    useLoginMock.mockReturnValue({
      login,
      connectWallet,
      authenticated: true,
      address: null,
    });

    const { result: result2 } = renderHook(() => useAuthClick());
    result2.current.handleClick(event);
    expect(connectWallet).toHaveBeenCalled();
  });

  it("returns true when already authenticated with address", () => {
    useLoginMock.mockReturnValue({
      login: vi.fn(),
      connectWallet: vi.fn(),
      authenticated: true,
      address: "0x" + "a".repeat(40),
    });

    const { result } = renderHook(() => useAuthClick());
    const event = { preventDefault: vi.fn() } as Partial<
      MouseEvent<HTMLButtonElement>
    > as MouseEvent<HTMLButtonElement>;
    expect(result.current.handleClick(event)).toBe(true);
  });

  it("logs in when address exists but not authenticated", () => {
    const login = vi.fn();
    const connectWallet = vi.fn();
    const onConnect = vi.fn();

    useLoginMock.mockReturnValue({
      login,
      connectWallet,
      authenticated: false,
      address: "0x" + "b".repeat(40),
    });

    const { result } = renderHook(() => useAuthClick(onConnect));
    const event = { preventDefault: vi.fn() } as Partial<
      MouseEvent<HTMLButtonElement>
    > as MouseEvent<HTMLButtonElement>;
    const ok = result.current.handleClick(event);

    expect(ok).toBe(false);
    expect(login).toHaveBeenCalled();
    expect(connectWallet).not.toHaveBeenCalled();
    expect(onConnect).not.toHaveBeenCalled();
  });
});
