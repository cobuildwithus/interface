// @vitest-environment happy-dom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HomePage from "./page";

vi.mock("@/components/layout/page-header", () => ({
  PageHeader: () => <div data-testid="page-header" />,
}));

vi.mock("@/components/features/goals/million-member-goal", () => ({
  MillionMemberGoal: () => <div data-testid="million-member-goal" />,
}));

vi.mock("./pay-events-list", () => ({
  PayEventsList: () => <div data-testid="pay-events-list" />,
}));

vi.mock("./treasury-chart", () => ({
  TreasuryChart: () => <div data-testid="treasury-chart" />,
}));

vi.mock("./revnet-actions", () => ({
  RevnetActions: () => <div data-testid="revnet-actions" />,
}));

vi.mock("./cli-oauth-authorize-modal", () => ({
  CliOAuthAuthorizeModal: (props: {
    request: { walletMode?: string | null } | null;
    error?: string;
  }) => (
    <div data-testid="oauth-modal">
      {props.request?.walletMode ?? "none"}|{props.error ?? ""}
    </div>
  ),
}));

vi.mock("./cli-setup-complete-modal", () => ({
  CliSetupCompleteModal: (props: { walletMode?: string | null }) => (
    <div data-testid="setup-modal">{props.walletMode ?? "none"}</div>
  ),
}));

describe("home page oauth query cutover", () => {
  it("uses wallet_mode for oauth authorize requests", async () => {
    render(
      await HomePage({
        searchParams: Promise.resolve({
          oauth_authorize: "1",
          response_type: "code",
          client_id: "cli",
          redirect_uri: "http://127.0.0.1:43111/auth/callback",
          scope: "offline_access tools:read wallet:read",
          code_challenge: "A".repeat(43),
          code_challenge_method: "S256",
          state: "state1234",
          agent_key: "default",
          wallet_mode: "hosted",
        }),
      })
    );

    expect(screen.getByTestId("oauth-modal").textContent).toContain("hosted|");
    expect(screen.queryByTestId("setup-modal")).toBeNull();
  });

  it("ignores removed payer_mode alias for setup-complete rendering", async () => {
    render(
      await HomePage({
        searchParams: Promise.resolve({
          cli_setup_complete: "1",
          agent_key: "default",
          payer_mode: "hosted",
        }),
      })
    );

    expect(screen.getByTestId("setup-modal").textContent).toContain("none");
  });
});
