/** @vitest-environment happy-dom */

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BaseError } from "viem";

const { useUserMock } = vi.hoisted(() => ({
  useUserMock: vi.fn(),
}));

const { useLinkedAccountsMock } = vi.hoisted(() => ({
  useLinkedAccountsMock: vi.fn(),
}));

const { useFarcasterSignerMock } = vi.hoisted(() => ({
  useFarcasterSignerMock: vi.fn(),
}));

const { useSignTypedDataMock } = vi.hoisted(() => ({
  useSignTypedDataMock: vi.fn(),
}));

const { useSWRConfigMock } = vi.hoisted(() => ({
  useSWRConfigMock: vi.fn(),
}));

const { refreshMock } = vi.hoisted(() => ({
  refreshMock: vi.fn(),
}));

const { toastSuccessMock, toastErrorMock } = vi.hoisted(() => ({
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

const { registerInitMock, registerCompleteMock } = vi.hoisted(() => ({
  registerInitMock: vi.fn(),
  registerCompleteMock: vi.fn(),
}));

vi.mock("@/lib/hooks/use-user", () => ({
  useUser: () => useUserMock(),
}));

vi.mock("@/lib/hooks/use-linked-accounts", () => ({
  useLinkedAccounts: () => useLinkedAccountsMock(),
}));

vi.mock("@/lib/hooks/use-farcaster-signer", () => ({
  useFarcasterSigner: () => useFarcasterSignerMock(),
}));

vi.mock("wagmi", () => ({
  useSignTypedData: () => useSignTypedDataMock(),
}));

vi.mock("swr", () => ({
  useSWRConfig: () => useSWRConfigMock(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}));

vi.mock("@/app/(app)/actions/farcaster-register", () => ({
  registerFarcasterInitAction: (...args: Parameters<typeof registerInitMock>) =>
    registerInitMock(...args),
  registerFarcasterCompleteAction: (...args: Parameters<typeof registerCompleteMock>) =>
    registerCompleteMock(...args),
}));

import { useFarcasterSignup } from "./use-farcaster-signup";

let fetchMock: ReturnType<typeof vi.fn>;
const makeInitPayload = () => ({
  fid: 1,
  deadline: 123,
  typedData: {
    domain: {
      name: "Farcaster",
      version: "1",
      chainId: 1,
      verifyingContract: "0x0000000000000000000000000000000000000000",
    },
    types: {
      EIP712Domain: [{ name: "name", type: "string" }],
      Transfer: [{ name: "fid", type: "uint256" }],
    },
    primaryType: "Transfer",
    message: {
      fid: "1",
      to: "0x0000000000000000000000000000000000000000",
      nonce: "0",
      deadline: "123",
    },
  },
});

const renderSignup = (onComplete: () => void = vi.fn()) =>
  renderHook(() => useFarcasterSignup({ onComplete }));

const mockAvailability = (available: boolean, reason?: string) => {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ available, reason }),
  } as Response);
};

describe("useFarcasterSignup", () => {
  beforeEach(() => {
    useUserMock.mockReturnValue({ address: "0x0000000000000000000000000000000000000001" });
    useLinkedAccountsMock.mockReturnValue({ mutate: vi.fn() });
    useFarcasterSignerMock.mockReturnValue({ mutate: vi.fn() });
    useSignTypedDataMock.mockReturnValue({
      signTypedDataAsync: vi.fn().mockResolvedValue("0xsig"),
    });
    useSWRConfigMock.mockReturnValue({ mutate: vi.fn() });
    refreshMock.mockReset();
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
    registerInitMock.mockReset();
    registerCompleteMock.mockReset();
    fetchMock = vi.fn();
    global.fetch = fetchMock as typeof fetch;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("checks username availability", async () => {
    vi.useFakeTimers();
    mockAvailability(true);

    const { result } = renderSignup();

    act(() => result.current.setUsername("alice"));
    await act(async () => {
      vi.advanceTimersByTime(400);
      await Promise.resolve();
    });

    expect(result.current.availability.status).toBe("available");
  });

  it("marks invalid usernames", async () => {
    const { result } = renderSignup();

    await act(async () => {
      result.current.setUsername("-bad");
      await Promise.resolve();
    });

    expect(result.current.availability.status).toBe("invalid");
  });

  it("marks invalid when availability reason is invalid", async () => {
    vi.useFakeTimers();
    mockAvailability(false, "invalid");

    const { result } = renderSignup();

    act(() => result.current.setUsername("alice"));
    await act(async () => {
      vi.advanceTimersByTime(400);
      await Promise.resolve();
    });

    expect(result.current.availability.status).toBe("invalid");
  });

  it("sets availability error when username check fails", async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => "nope",
    } as Response);

    const { result } = renderSignup();

    act(() => result.current.setUsername("alice"));
    await act(async () => {
      vi.advanceTimersByTime(400);
      await Promise.resolve();
    });

    expect(result.current.availability).toEqual({ status: "error", message: "nope" });
  });

  it("resets availability when username is cleared", async () => {
    vi.useFakeTimers();
    mockAvailability(true);

    const { result } = renderSignup();

    act(() => result.current.setUsername("alice"));
    await act(async () => {
      vi.advanceTimersByTime(400);
      await Promise.resolve();
    });

    await act(async () => {
      result.current.setUsername("");
      await Promise.resolve();
    });

    expect(result.current.availability.status).toBe("idle");
  });

  it("handles unavailable usernames", async () => {
    vi.useFakeTimers();
    mockAvailability(false);

    const { result } = renderSignup();

    act(() => result.current.setUsername("alice"));
    await act(async () => {
      vi.advanceTimersByTime(400);
      await Promise.resolve();
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.error).toBe("Choose an available username before continuing.");
  });

  it("blocks submission when no wallet is connected", async () => {
    vi.useFakeTimers();
    useUserMock.mockReturnValue({ address: null });
    mockAvailability(true);

    const { result } = renderSignup();

    act(() => result.current.setUsername("alice"));
    await act(async () => {
      vi.advanceTimersByTime(400);
      await Promise.resolve();
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(toastErrorMock).toHaveBeenCalledWith(
      "Connect a wallet before creating a Farcaster account."
    );
  });

  it("blocks submission with invalid username input", async () => {
    const { result } = renderSignup();

    await act(async () => {
      result.current.setUsername("??");
      await Promise.resolve();
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.error).toBe("Enter a valid Farcaster username.");
  });

  it("creates an account on success", async () => {
    vi.useFakeTimers();
    const signTypedDataAsync = vi.fn().mockResolvedValue("0xsig");
    useSignTypedDataMock.mockReturnValue({ signTypedDataAsync });
    const mutateLinkedAccounts = vi.fn();
    useLinkedAccountsMock.mockReturnValue({ mutate: mutateLinkedAccounts });
    const mutateSigner = vi.fn();
    useFarcasterSignerMock.mockReturnValue({ mutate: mutateSigner });
    const mutateConfig = vi.fn();
    useSWRConfigMock.mockReturnValue({ mutate: mutateConfig });
    const onComplete = vi.fn();

    mockAvailability(true);
    registerInitMock.mockResolvedValue({ ok: true, data: makeInitPayload() });
    registerCompleteMock.mockResolvedValue({
      ok: true,
      data: { fid: 1, username: "alice", signerUuid: "uuid" },
    });

    const { result } = renderSignup(onComplete);

    act(() => result.current.setUsername("alice"));
    await act(async () => {
      vi.advanceTimersByTime(400);
      await Promise.resolve();
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(signTypedDataAsync).toHaveBeenCalled();
    expect(mutateLinkedAccounts).toHaveBeenCalled();
    expect(mutateSigner).toHaveBeenCalled();
    expect(mutateConfig).toHaveBeenCalledWith("user");
    expect(refreshMock).toHaveBeenCalled();
    expect(toastSuccessMock).toHaveBeenCalledWith("Farcaster account created.");
    expect(onComplete).toHaveBeenCalled();
  });

  it("surfaces errors from the init action", async () => {
    vi.useFakeTimers();
    mockAvailability(true);
    registerInitMock.mockResolvedValue({ ok: false, error: "init failed" });

    const { result } = renderSignup();

    act(() => result.current.setUsername("alice"));
    await act(async () => {
      vi.advanceTimersByTime(400);
      await Promise.resolve();
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.error).toBe("init failed");
    expect(toastErrorMock).toHaveBeenCalledWith("init failed");
  });

  it("surfaces BaseError messages from signing", async () => {
    vi.useFakeTimers();
    useSignTypedDataMock.mockReturnValue({
      signTypedDataAsync: vi.fn().mockRejectedValue(new BaseError("wallet rejected")),
    });
    mockAvailability(true);
    registerInitMock.mockResolvedValue({ ok: true, data: makeInitPayload() });

    const { result } = renderSignup();

    act(() => result.current.setUsername("alice"));
    await act(async () => {
      vi.advanceTimersByTime(400);
      await Promise.resolve();
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.error).toBe("wallet rejected");
    expect(toastErrorMock).toHaveBeenCalledWith("wallet rejected");
  });

  it("surfaces errors from the completion action", async () => {
    vi.useFakeTimers();
    mockAvailability(true);
    registerInitMock.mockResolvedValue({ ok: true, data: makeInitPayload() });
    registerCompleteMock.mockResolvedValue({ ok: false, error: "Request failed." });

    const { result } = renderSignup();

    act(() => result.current.setUsername("alice"));
    await act(async () => {
      vi.advanceTimersByTime(400);
      await Promise.resolve();
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.error).toBe("Request failed.");
    expect(toastErrorMock).toHaveBeenCalledWith("Request failed.");
  });
});
