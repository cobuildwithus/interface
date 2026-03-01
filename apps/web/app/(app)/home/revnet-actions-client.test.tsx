/**
 * @vitest-environment happy-dom
 */
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RevnetActionButtons } from "./revnet-actions-client";

const { useRevnetPositionMock, useLoginMock, cashOutDialogMock, loanDialogMock } = vi.hoisted(
  () => ({
    useRevnetPositionMock: vi.fn(),
    useLoginMock: vi.fn(),
    cashOutDialogMock: vi.fn(({ children }) => <>{children}</>),
    loanDialogMock: vi.fn(({ children }) => <>{children}</>),
  })
);

vi.mock("@/lib/hooks/use-revnet-position", () => ({
  useRevnetPosition: useRevnetPositionMock,
}));

vi.mock("@/lib/domains/auth/use-login", () => ({
  useLogin: useLoginMock,
}));

vi.mock("@/components/ui/auth-button", () => ({
  AuthButton: ({ children, className }: { children?: ReactNode; className?: string }) => (
    <button type="button" className={className}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/features/funding/swap-dialog", () => ({
  SwapDialog: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

vi.mock("./cash-out-dialog", () => ({
  CashOutDialog: cashOutDialogMock,
}));

vi.mock("./loan-dialog", () => ({
  LoanDialog: loanDialogMock,
}));

describe("RevnetActionButtons", () => {
  beforeEach(() => {
    useRevnetPositionMock.mockReset();
    useLoginMock.mockReset();
    cashOutDialogMock.mockClear();
    loanDialogMock.mockClear();
  });

  it("shows one connect wallet button when disconnected", () => {
    useRevnetPositionMock.mockReturnValue({ isConnected: false });
    useLoginMock.mockReturnValue({ ready: true, authenticated: false });

    render(<RevnetActionButtons />);

    const connectButtons = screen.getAllByRole("button", { name: "Connect wallet" });
    expect(connectButtons).toHaveLength(1);
    expect(connectButtons[0]).toHaveClass("w-full");
    expect(screen.queryByRole("button", { name: "Buy" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cash out" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Take a loan" })).not.toBeInTheDocument();
  });

  it("shows trading actions when connected", () => {
    const position = { isConnected: true, tokenBalance: "100" };
    const tokenLogoUrl = "https://example.com/token.png";
    useRevnetPositionMock.mockReturnValue(position);
    useLoginMock.mockReturnValue({ ready: true, authenticated: true });

    render(<RevnetActionButtons tokenLogoUrl={tokenLogoUrl} />);

    expect(screen.getByRole("button", { name: "Buy" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cash out" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Take a loan" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Connect wallet" })).not.toBeInTheDocument();

    expect(cashOutDialogMock).toHaveBeenCalledTimes(1);
    expect(cashOutDialogMock.mock.calls[0]?.[0]).toMatchObject({ position, tokenLogoUrl });

    expect(loanDialogMock).toHaveBeenCalledTimes(1);
    expect(loanDialogMock.mock.calls[0]?.[0]).toMatchObject({ position, tokenLogoUrl });
  });

  it("shows trading actions from server auth before login hook is ready", () => {
    const position = { isConnected: true, tokenBalance: "100" };
    useRevnetPositionMock.mockReturnValue(position);
    useLoginMock.mockReturnValue({ ready: false, authenticated: false });

    render(<RevnetActionButtons isAuthenticated />);

    expect(screen.queryByRole("button", { name: "Connect wallet" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Buy" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cash out" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Take a loan" })).toBeInTheDocument();
  });
});
