/**
 * @vitest-environment happy-dom
 */
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RevnetBalanceCard } from "./revnet-balance-card";

const { currencyMock, actionButtonsMock } = vi.hoisted(() => ({
  currencyMock: vi.fn(),
  actionButtonsMock: vi.fn(),
}));

vi.mock("@/components/ui/currency", () => ({
  Currency: ({ value, kind }: { value: number; kind?: string }) => {
    currencyMock({ value, kind });
    return <span>{`${value}:${kind ?? "usd"}`}</span>;
  },
}));

vi.mock("./revnet-actions-client", () => ({
  RevnetActionButtons: ({
    tokenLogoUrl,
    isAuthenticated,
  }: {
    tokenLogoUrl?: string | null;
    isAuthenticated?: boolean;
  }) => {
    actionButtonsMock({ tokenLogoUrl, isAuthenticated });
    return <div data-testid="revnet-action-buttons" />;
  },
}));

describe("RevnetBalanceCard", () => {
  beforeEach(() => {
    currencyMock.mockReset();
    actionButtonsMock.mockReset();
  });

  it("shows -- for both Balance and Floor value when unauthenticated", () => {
    render(
      <RevnetBalanceCard
        isAuthenticated={false}
        tokenSymbol="REV"
        baseTokenSymbol="ETH"
        tokenLogoUrl={null}
        balanceAmount={12}
        cashOutAmount={34}
      />
    );

    expect(screen.getAllByText("--")).toHaveLength(2);
    expect(currencyMock).not.toHaveBeenCalled();
    expect(actionButtonsMock).toHaveBeenCalledWith({ tokenLogoUrl: null, isAuthenticated: false });
  });

  it("renders token values for both rows when authenticated", () => {
    render(
      <RevnetBalanceCard
        isAuthenticated
        tokenSymbol="REV"
        baseTokenSymbol="ETH"
        tokenLogoUrl="https://example.com/logo.png"
        balanceAmount={12}
        cashOutAmount={34}
      />
    );

    expect(screen.queryByText("--")).not.toBeInTheDocument();
    expect(currencyMock).toHaveBeenCalledTimes(2);
    expect(currencyMock).toHaveBeenNthCalledWith(1, { value: 12, kind: "token" });
    expect(currencyMock).toHaveBeenNthCalledWith(2, { value: 34, kind: "token" });
    expect(actionButtonsMock).toHaveBeenCalledWith({
      tokenLogoUrl: "https://example.com/logo.png",
      isAuthenticated: true,
    });
  });
});
