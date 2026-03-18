/**
 * @vitest-environment happy-dom
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useLoginMock = vi.fn();
const useUserContextMock = vi.fn();

vi.mock("@/lib/domains/auth/use-login", () => ({
  useLogin: () => useLoginMock(),
}));

vi.mock("@/lib/domains/auth/user-context", () => ({
  useUserContext: () => useUserContextMock(),
}));

import { AuthButton } from "./auth-button";

describe("AuthButton", () => {
  beforeEach(() => {
    useLoginMock.mockReset();
    useUserContextMock.mockReset();
    useUserContextMock.mockReturnValue(null);
  });

  it("passes trigger clicks through while a server session is hydrating", () => {
    const login = vi.fn();
    const connectWallet = vi.fn();
    const onClick = vi.fn();
    useLoginMock.mockReturnValue({
      login,
      connectWallet,
      authenticated: false,
      address: null,
      ready: false,
    });
    useUserContextMock.mockReturnValue({
      address: "0x" + "a".repeat(40),
    });

    render(
      <AuthButton data-slot="dialog-trigger" onClick={onClick}>
        Buy
      </AuthButton>
    );

    fireEvent.click(screen.getByRole("button", { name: "Buy" }));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(login).not.toHaveBeenCalled();
    expect(connectWallet).not.toHaveBeenCalled();
  });

  it("blocks non-trigger clicks while a server session is hydrating", () => {
    const login = vi.fn();
    const connectWallet = vi.fn();
    const onClick = vi.fn();
    useLoginMock.mockReturnValue({
      login,
      connectWallet,
      authenticated: false,
      address: null,
      ready: false,
    });
    useUserContextMock.mockReturnValue({
      address: "0x" + "b".repeat(40),
    });

    render(<AuthButton onClick={onClick}>Create goal</AuthButton>);

    fireEvent.click(screen.getByRole("button", { name: "Create goal" }));

    expect(onClick).not.toHaveBeenCalled();
    expect(login).not.toHaveBeenCalled();
    expect(connectWallet).not.toHaveBeenCalled();
  });
});
