/**
 * @vitest-environment happy-dom
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BuildBotSetupDialog } from "./build-bot-setup-dialog";

const {
  useLoginMock,
  useUserContextMock,
  routerReplaceMock,
  toastLoadingMock,
  toastSuccessMock,
  toastErrorMock,
} = vi.hoisted(() => ({
  useLoginMock: vi.fn(),
  useUserContextMock: vi.fn(),
  routerReplaceMock: vi.fn(),
  toastLoadingMock: vi.fn<(message?: unknown, options?: unknown) => string>(() => "toast-id"),
  toastSuccessMock: vi.fn<(message?: unknown, options?: unknown) => void>(),
  toastErrorMock: vi.fn<(message?: unknown, options?: unknown) => void>(),
}));

let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
  usePathname: () => "/home",
  useRouter: () => ({
    replace: (...args: unknown[]) => routerReplaceMock(...args),
  }),
}));

vi.mock("@/lib/domains/auth/use-login", () => ({
  useLogin: () => useLoginMock(),
}));

vi.mock("@/lib/domains/auth/user-context", () => ({
  useUserContext: () => useUserContextMock(),
}));

vi.mock("sonner", () => ({
  toast: {
    loading: (message?: unknown, options?: unknown) => toastLoadingMock(message, options),
    success: (message?: unknown, options?: unknown) => toastSuccessMock(message, options),
    error: (message?: unknown, options?: unknown) => toastErrorMock(message, options),
  },
}));

vi.mock("@/components/ui/auth-button", () => ({
  AuthButton: ({ children, className }: { children?: ReactNode; className?: string }) => (
    <button type="button" className={className}>
      {children}
    </button>
  ),
}));

function setValidSetupParams() {
  const state = "state123_state123_state123_state123";
  searchParams = new URLSearchParams();
  searchParams.set("buildBotSetup", "1");
  searchParams.set("buildBotState", state);
  searchParams.set("buildBotCallback", `http://127.0.0.1:4011/api/buildbot/cli/callback/${state}`);
  searchParams.set("buildBotNetwork", "base-sepolia");
  searchParams.set("buildBotAgent", "default");
  return state;
}

describe("BuildBotSetupDialog", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    searchParams = new URLSearchParams();
    useLoginMock.mockReset();
    useUserContextMock.mockReset();
    routerReplaceMock.mockReset();
    toastLoadingMock.mockReset();
    toastLoadingMock.mockReturnValue("toast-id");
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
    useLoginMock.mockReturnValue({ ready: true, authenticated: true });
    useUserContextMock.mockReturnValue({ address: "0x000000000000000000000000000000000000dEaD" });
  });

  it("does not render when setup params are not present", () => {
    render(<BuildBotSetupDialog />);
    expect(screen.queryByText("Finish Build Bot setup")).not.toBeInTheDocument();
  });

  it("does not render when callback uses the legacy build-bot prefix", () => {
    const state = "state123_state123_state123_state123";
    searchParams = new URLSearchParams();
    searchParams.set("buildBotSetup", "1");
    searchParams.set("buildBotState", state);
    searchParams.set(
      "buildBotCallback",
      `http://127.0.0.1:4011/api/build-bot/cli/callback/${state}`
    );

    render(<BuildBotSetupDialog />);
    expect(screen.queryByText("Finish Build Bot setup")).not.toBeInTheDocument();
  });

  it("shows connect button when user is not authenticated", () => {
    setValidSetupParams();
    useLoginMock.mockReturnValue({ ready: true, authenticated: false });
    useUserContextMock.mockReturnValue({ address: null });

    render(<BuildBotSetupDialog />);
    const connectButton = screen.getByRole("button", { name: "Connect wallet" });
    const cancelButton = screen.getByRole("button", { name: "Cancel" });

    expect(connectButton).toBeInTheDocument();
    expect(connectButton).toHaveClass("h-14", "w-full");
    expect(cancelButton).toHaveClass("h-11", "w-full");
    expect(connectButton.querySelector("svg")).toBeInTheDocument();
    expect(
      connectButton.compareDocumentPosition(cancelButton) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Approve setup" })).not.toBeInTheDocument();
  });

  it("uses simplified setup copy and hides technical callback/network/agent details", () => {
    setValidSetupParams();

    render(<BuildBotSetupDialog />);

    expect(screen.getByText("Finish Build Bot setup")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Connect your wallet and approve a one-time token for this CLI session. Only continue if you started setup in your terminal."
      )
    ).toBeInTheDocument();
    expect(screen.queryByText("Local callback")).not.toBeInTheDocument();
    expect(screen.queryByText(/Network:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Agent:/i)).not.toBeInTheDocument();
  });

  it("clears setup params while preserving unrelated query params on cancel", () => {
    setValidSetupParams();
    searchParams.set("tab", "activity");

    render(<BuildBotSetupDialog />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(routerReplaceMock).toHaveBeenCalledWith("/home?tab=activity", { scroll: false });
  });

  it("clears setup params when dialog close is used", () => {
    setValidSetupParams();
    searchParams.set("tab", "activity");

    render(<BuildBotSetupDialog />);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(routerReplaceMock).toHaveBeenCalledWith("/home?tab=activity", { scroll: false });
  });

  it("creates a token and relays it to localhost callback on approval", async () => {
    const state = setValidSetupParams();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, token: "bbt_secure_token" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<BuildBotSetupDialog />);
    fireEvent.click(screen.getByRole("button", { name: "Approve setup" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    const [tokenUrl, tokenInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(tokenUrl).toBe("/api/buildbot/token");
    expect(tokenInit.method).toBe("POST");
    expect(JSON.parse(String(tokenInit.body))).toEqual({
      label: "build-bot-cli-default",
      agentKey: "default",
    });

    const [callbackUrl, callbackInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(callbackUrl).toBe(`http://127.0.0.1:4011/api/buildbot/cli/callback/${state}`);
    expect(callbackInit.method).toBe("POST");
    expect(JSON.parse(String(callbackInit.body))).toEqual({
      state,
      token: "bbt_secure_token",
    });

    expect(routerReplaceMock).toHaveBeenCalledWith("/home", { scroll: false });
    expect(toastSuccessMock).toHaveBeenCalled();
    expect(toastErrorMock).not.toHaveBeenCalled();
  });

  it("shows an error and does not clear setup params when token generation fails", async () => {
    setValidSetupParams();
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ ok: false, error: "denied" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<BuildBotSetupDialog />);
    fireEvent.click(screen.getByRole("button", { name: "Approve setup" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(toastErrorMock).toHaveBeenCalledWith("denied", { id: "toast-id" });
    expect(routerReplaceMock).not.toHaveBeenCalled();
  });

  it("shows an error and does not clear setup params when callback relay fails", async () => {
    setValidSetupParams();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, token: "bbt_secure_token" }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ ok: false, error: "callback failed" }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<BuildBotSetupDialog />);
    fireEvent.click(screen.getByRole("button", { name: "Approve setup" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(toastErrorMock).toHaveBeenCalledWith("callback failed", { id: "toast-id" });
    expect(routerReplaceMock).not.toHaveBeenCalled();
  });

  it("falls back to status when token endpoint returns non-JSON error payload", async () => {
    setValidSetupParams();
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error("invalid json");
      },
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<BuildBotSetupDialog />);
    fireEvent.click(screen.getByRole("button", { name: "Approve setup" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(toastErrorMock).toHaveBeenCalledWith("Token generation failed (500)", {
      id: "toast-id",
    });
    expect(routerReplaceMock).not.toHaveBeenCalled();
  });

  it("falls back to callback status when callback endpoint returns non-JSON payload", async () => {
    setValidSetupParams();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, token: "bbt_secure_token" }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 502,
        json: async () => {
          throw new Error("invalid json");
        },
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<BuildBotSetupDialog />);
    fireEvent.click(screen.getByRole("button", { name: "Approve setup" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(toastErrorMock).toHaveBeenCalledWith("CLI callback failed (502)", { id: "toast-id" });
    expect(routerReplaceMock).not.toHaveBeenCalled();
  });

  it("omits agentKey from token creation payload when setup agent is invalid", async () => {
    const state = "state123_state123_state123_state123";
    searchParams = new URLSearchParams();
    searchParams.set("buildBotSetup", "1");
    searchParams.set("buildBotState", state);
    searchParams.set(
      "buildBotCallback",
      `http://127.0.0.1:4011/api/buildbot/cli/callback/${state}`
    );
    searchParams.set("buildBotAgent", " ../../invalid ");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, token: "bbt_secure_token" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<BuildBotSetupDialog />);
    fireEvent.click(screen.getByRole("button", { name: "Approve setup" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const [, tokenInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(tokenInit.body))).toEqual({
      label: "build-bot-cli-default",
    });
  });
});
