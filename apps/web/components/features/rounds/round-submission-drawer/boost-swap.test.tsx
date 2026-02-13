/**
 * @vitest-environment happy-dom
 */
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BoostSwap } from "./boost-swap";

let didConfirm = false;

const { registerDirectIntentActionMock } = vi.hoisted(() => ({
  registerDirectIntentActionMock: vi.fn(),
}));

vi.mock("@/app/(app)/actions/swaps-direct-intent", () => ({
  registerDirectIntentAction: (...args: Parameters<typeof registerDirectIntentActionMock>) =>
    registerDirectIntentActionMock(...args),
}));

vi.mock("@/components/ui/auth-button", async () => {
  const React = await import("react");
  return {
    AuthButton: ({
      children,
      disabled,
      onClick,
      className,
    }: {
      children?: React.ReactNode;
      disabled?: boolean;
      onClick?: React.MouseEventHandler<HTMLButtonElement>;
      className?: string;
    }) => (
      <button type="button" disabled={disabled} onClick={onClick} className={className}>
        {children}
      </button>
    ),
  };
});

vi.mock("@/lib/hooks/use-boost-swap", () => {
  return {
    useBoostSwap: vi.fn((opts: { onTxConfirmed?: (hash: string) => void }) => {
      // Simulate tx confirmation after initial render to avoid triggering setState during render.
      if (!didConfirm) {
        didConfirm = true;
        queueMicrotask(() => {
          opts?.onTxConfirmed?.("0x" + "1".repeat(64));
        });
      }
      return {
        payAmount: "0.01",
        memo: "",
        formattedBalance: "1.0",
        ethPriceUsdc: 3000,
        isDisabled: false,
        buttonText: "Buy $COBUILD",
        hasWallet: true,
        memoMaxLength: 500,
        usdPresets: [1, 5, 25],
        onPayAmountChange: vi.fn(),
        onMemoChange: vi.fn(),
        onMaxClick: vi.fn(),
        onPresetClick: vi.fn(),
        onSwap: vi.fn(),
      };
    }),
  };
});

describe("BoostSwap", () => {
  beforeEach(() => {
    didConfirm = false;
    registerDirectIntentActionMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("disables pay button after intent failure to prevent duplicate payments", async () => {
    registerDirectIntentActionMock.mockResolvedValue({ ok: false, error: "boom" });

    render(<BoostSwap username="alice" castHash={"0x" + "c".repeat(40)} />);

    const button = screen.getByRole("button", { name: /fund/i });

    // Wait for registerIntent to run and set error state
    await waitFor(() => {
      expect(registerDirectIntentActionMock).toHaveBeenCalled();
      expect(button).toBeDisabled();
    });
  });

  it("calls onIntentSuccess when intent records successfully", async () => {
    registerDirectIntentActionMock.mockResolvedValue({ ok: true });

    const onIntentSuccess = vi.fn();
    render(
      <BoostSwap
        username="alice"
        castHash={"0x" + "c".repeat(40)}
        onIntentSuccess={onIntentSuccess}
      />
    );

    await waitFor(() => {
      expect(onIntentSuccess).toHaveBeenCalledWith(expect.stringMatching(/^0x1+/));
    });
  });
});
