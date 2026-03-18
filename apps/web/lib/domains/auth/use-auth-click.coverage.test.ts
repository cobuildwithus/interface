/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import type { MouseEvent } from "react";

const useLoginMock = vi.fn();
const useUserContextMock = vi.fn();
vi.mock("@/lib/domains/auth/use-login", () => ({
  useLogin: () => useLoginMock(),
}));
vi.mock("@/lib/domains/auth/user-context", () => ({
  useUserContext: () => useUserContextMock(),
}));

import { useAuthClick } from "@/lib/domains/auth/use-auth-click";

describe("useAuthClick", () => {
  beforeEach(() => {
    useLoginMock.mockReset();
    useUserContextMock.mockReset();
    useUserContextMock.mockReturnValue(null);
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
      ready: true,
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
      ready: true,
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
      ready: true,
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
      ready: true,
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

  it("allows pending server sessions to pass through for trigger surfaces during hydration", () => {
    const login = vi.fn();
    const connectWallet = vi.fn();
    useLoginMock.mockReturnValue({
      login,
      connectWallet,
      authenticated: false,
      address: null,
      ready: false,
    });
    useUserContextMock.mockReturnValue({
      address: "0x" + "c".repeat(40),
    });

    const { result } = renderHook(() => useAuthClick(undefined, { isTriggerSurface: true }));
    const event = { preventDefault: vi.fn() } as Partial<
      MouseEvent<HTMLButtonElement>
    > as MouseEvent<HTMLButtonElement>;

    expect(result.current.address).toBe("0x" + "c".repeat(40));
    expect(result.current.handleClick(event)).toBe(true);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(login).not.toHaveBeenCalled();
    expect(connectWallet).not.toHaveBeenCalled();
  });

  it("blocks non-trigger actions while a server session is still hydrating", () => {
    const login = vi.fn();
    const connectWallet = vi.fn();
    const onConnect = vi.fn();
    useLoginMock.mockReturnValue({
      login,
      connectWallet,
      authenticated: false,
      address: null,
      ready: false,
    });
    useUserContextMock.mockReturnValue({
      address: "0x" + "d".repeat(40),
    });

    const { result } = renderHook(() => useAuthClick(onConnect));
    const event = { preventDefault: vi.fn() } as Partial<
      MouseEvent<HTMLButtonElement>
    > as MouseEvent<HTMLButtonElement>;

    expect(result.current.address).toBe("0x" + "d".repeat(40));
    expect(result.current.handleClick(event)).toBe(false);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(login).not.toHaveBeenCalled();
    expect(connectWallet).not.toHaveBeenCalled();
    expect(onConnect).not.toHaveBeenCalled();
  });
});
