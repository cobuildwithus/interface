/**
 * @vitest-environment happy-dom
 */
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useLoginMock = vi.hoisted(() => vi.fn());
const useLinkAccountMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/domains/auth/use-login", () => ({
  useLogin: () => useLoginMock(),
}));

vi.mock("@/lib/domains/auth/use-link-account", () => ({
  useLinkAccount: () => useLinkAccountMock(),
}));

vi.mock("@/components/features/auth/link-account-button", () => ({
  LinkAccountButton: () => null,
}));

import { SidebarUserMenu } from "./sidebar-user-menu";

describe("SidebarUserMenu", () => {
  beforeEach(() => {
    useLoginMock.mockReset();
    useLinkAccountMock.mockReset();

    useLoginMock.mockReturnValue({
      ready: true,
      authenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
    });
    useLinkAccountMock.mockReturnValue({
      linkedAccounts: {},
    });
  });

  it("does not evaluate auth hooks during server render", () => {
    useLoginMock.mockImplementation(() => {
      throw new Error("server render should not read login state");
    });
    useLinkAccountMock.mockImplementation(() => {
      throw new Error("server render should not read linked accounts");
    });

    const originalWindow = globalThis.window;

    vi.stubGlobal("window", undefined);

    try {
      expect(() => renderToString(<SidebarUserMenu />)).not.toThrow();
    } finally {
      vi.stubGlobal("window", originalWindow);
    }
  });
});
