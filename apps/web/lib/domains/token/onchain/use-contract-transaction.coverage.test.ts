/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const useWriteContractMock = vi.fn();
const useWaitMock = vi.fn();
const useAccountMock = vi.fn();
const useSwitchChainMock = vi.fn();
const useLoginMock = vi.fn();
const routerRefresh = vi.hoisted(() => vi.fn());
type ToastAction = { onClick?: () => void };
type ToastOptions = { action?: ToastAction };
const toastMock = vi.hoisted(() => ({
  loading: vi.fn<(message: string, options?: ToastOptions) => string>(() => "toast-id"),
  error: vi.fn(),
  success: vi.fn(),
  dismiss: vi.fn(),
}));

vi.mock("wagmi", () => ({
  useWriteContract: () => useWriteContractMock(),
  useWaitForTransactionReceipt: (args: Parameters<typeof useWaitMock>[0]) => useWaitMock(args),
  useAccount: () => useAccountMock(),
  useSwitchChain: () => useSwitchChainMock(),
}));

vi.mock("@/lib/domains/auth/use-login", () => ({
  useLogin: () => useLoginMock(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: routerRefresh }) }));
vi.mock("sonner", () => ({ toast: toastMock }));

import { useContractTransaction } from "@/lib/domains/token/onchain/use-contract-transaction";

const ACCOUNT = ("0x" + "a".repeat(40)) as `0x${string}`;

describe("useContractTransaction", () => {
  beforeEach(() => {
    useWriteContractMock.mockReset();
    useWaitMock.mockReset();
    useAccountMock.mockReset();
    useSwitchChainMock.mockReset();
    useLoginMock.mockReset();
    routerRefresh.mockReset();
    toastMock.loading.mockClear();
    toastMock.error.mockClear();
    toastMock.success.mockClear();
    toastMock.dismiss.mockClear();
  });

  it("shows loading toast when pending", () => {
    useWriteContractMock.mockReturnValue({ data: "0xhash", isPending: false, error: null });
    useWaitMock.mockReturnValue({ isLoading: true, isSuccess: false });
    useAccountMock.mockReturnValue({ chainId: 1, isConnected: true, address: ACCOUNT });
    useSwitchChainMock.mockReturnValue({ switchChainAsync: vi.fn() });
    useLoginMock.mockReturnValue({ login: vi.fn(), connectWallet: vi.fn() });

    renderHook(() => useContractTransaction({ chainId: 1, defaultToastId: "toast" }));
    expect(toastMock.loading).toHaveBeenCalled();
  });

  it("opens explorer URL from loading action", () => {
    useWriteContractMock.mockReturnValue({ data: "0xhash", isPending: false, error: null });
    useWaitMock.mockReturnValue({ isLoading: true, isSuccess: false });
    useAccountMock.mockReturnValue({ chainId: 8453, isConnected: true, address: ACCOUNT });
    useSwitchChainMock.mockReturnValue({ switchChainAsync: vi.fn() });
    useLoginMock.mockReturnValue({ login: vi.fn(), connectWallet: vi.fn() });

    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    renderHook(() => useContractTransaction({ chainId: 8453, defaultToastId: "toast" }));
    const args = toastMock.loading.mock.calls[0]?.[1];
    args?.action?.onClick?.();
    expect(openSpy).toHaveBeenCalledWith("https://basescan.org/tx/0xhash");
    openSpy.mockRestore();
  });

  it("handles user rejection by dismissing toast", () => {
    useWriteContractMock.mockReturnValue({
      data: "0xhash",
      isPending: false,
      error: { message: "User rejected" },
    });
    useWaitMock.mockReturnValue({ isLoading: false, isSuccess: false });
    useAccountMock.mockReturnValue({ chainId: 1, isConnected: true, address: ACCOUNT });
    useSwitchChainMock.mockReturnValue({ switchChainAsync: vi.fn() });
    useLoginMock.mockReturnValue({ login: vi.fn(), connectWallet: vi.fn() });

    renderHook(() => useContractTransaction({ chainId: 1, defaultToastId: "toast" }));
    expect(toastMock.dismiss).toHaveBeenCalled();
  });

  it("surfaces non-user errors", () => {
    useWriteContractMock.mockReturnValue({
      data: "0xhash",
      isPending: false,
      error: { message: "Something broke", shortMessage: "Short failure" },
    });
    useWaitMock.mockReturnValue({ isLoading: false, isSuccess: false });
    useAccountMock.mockReturnValue({ chainId: 1, isConnected: true, address: ACCOUNT });
    useSwitchChainMock.mockReturnValue({ switchChainAsync: vi.fn() });
    useLoginMock.mockReturnValue({ login: vi.fn(), connectWallet: vi.fn() });

    renderHook(() => useContractTransaction({ chainId: 1, defaultToastId: "toast" }));
    expect(toastMock.error).toHaveBeenCalled();
  });

  it("handles success state", () => {
    const onSuccess = vi.fn();
    useWriteContractMock.mockReturnValue({ data: "0xhash", isPending: false, error: null });
    useWaitMock.mockReturnValue({ isLoading: false, isSuccess: true });
    useAccountMock.mockReturnValue({ chainId: 1, isConnected: true, address: ACCOUNT });
    useSwitchChainMock.mockReturnValue({ switchChainAsync: vi.fn() });
    useLoginMock.mockReturnValue({ login: vi.fn(), connectWallet: vi.fn() });

    renderHook(() => useContractTransaction({ chainId: 1, onSuccess, defaultToastId: "toast" }));
    expect(toastMock.success).toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledWith("0xhash");
  });

  it("uses default onSuccess to refresh", () => {
    useWriteContractMock.mockReturnValue({ data: "0xhash", isPending: false, error: null });
    useWaitMock.mockReturnValue({ isLoading: false, isSuccess: true });
    useAccountMock.mockReturnValue({ chainId: 1, isConnected: true, address: ACCOUNT });
    useSwitchChainMock.mockReturnValue({ switchChainAsync: vi.fn() });
    useLoginMock.mockReturnValue({ login: vi.fn(), connectWallet: vi.fn() });

    renderHook(() => useContractTransaction({ chainId: 1, defaultToastId: "toast" }));
    expect(routerRefresh).toHaveBeenCalled();
  });

  it("prepareWallet triggers connect/login/switch", async () => {
    const connectWallet = vi.fn();
    const login = vi.fn();
    const switchChainAsync = vi.fn().mockRejectedValue(new Error("nope"));

    useWriteContractMock.mockReturnValue({ data: undefined, isPending: false, error: null });
    useWaitMock.mockReturnValue({ isLoading: false, isSuccess: false });
    useAccountMock
      .mockReturnValueOnce({ chainId: 1, isConnected: false, address: null })
      .mockReturnValueOnce({ chainId: 1, isConnected: true, address: null })
      .mockReturnValueOnce({ chainId: 1, isConnected: true, address: ACCOUNT });
    useSwitchChainMock.mockReturnValue({ switchChainAsync });
    useLoginMock.mockReturnValue({ login, connectWallet });

    const { result, rerender } = renderHook(() =>
      useContractTransaction({ chainId: 8453, defaultToastId: "toast" })
    );

    await act(async () => {
      await result.current.prepareWallet();
    });
    expect(connectWallet).toHaveBeenCalled();

    rerender();
    await act(async () => {
      await result.current.prepareWallet();
    });
    expect(login).toHaveBeenCalled();

    rerender();
    await act(async () => {
      await result.current.prepareWallet();
    });
    expect(toastMock.error).toHaveBeenCalled();
  });

  it("prepareWallet switches chain when possible", async () => {
    const switchChainAsync = vi.fn().mockResolvedValue(undefined);
    useWriteContractMock.mockReturnValue({ data: undefined, isPending: false, error: null });
    useWaitMock.mockReturnValue({ isLoading: false, isSuccess: false });
    useAccountMock.mockReturnValue({ chainId: 1, isConnected: true, address: ACCOUNT });
    useSwitchChainMock.mockReturnValue({ switchChainAsync });
    useLoginMock.mockReturnValue({ login: vi.fn(), connectWallet: vi.fn() });

    const { result } = renderHook(() =>
      useContractTransaction({ chainId: 8453, defaultToastId: "toast" })
    );

    await act(async () => {
      await result.current.prepareWallet();
    });

    expect(switchChainAsync).toHaveBeenCalled();
  });

  it("prepareWallet shows loading toast on correct chain", async () => {
    useWriteContractMock.mockReturnValue({ data: undefined, isPending: false, error: null });
    useWaitMock.mockReturnValue({ isLoading: false, isSuccess: false });
    useAccountMock.mockReturnValue({ chainId: 1, isConnected: true, address: ACCOUNT });
    useSwitchChainMock.mockReturnValue({ switchChainAsync: vi.fn() });
    useLoginMock.mockReturnValue({ login: vi.fn(), connectWallet: vi.fn() });

    const { result } = renderHook(() => useContractTransaction({ chainId: 1 }));
    await act(async () => {
      await result.current.prepareWallet("custom-toast");
    });

    expect(toastMock.loading).toHaveBeenCalledWith("Transaction in progress…", {
      id: "custom-toast",
      action: null,
    });
  });
});
