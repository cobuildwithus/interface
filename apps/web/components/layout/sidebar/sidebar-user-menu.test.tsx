/**
 * @vitest-environment happy-dom
 */
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { SidebarUserMenu } from "./sidebar-user-menu";

describe("SidebarUserMenu", () => {
  it("does not require auth or sidebar hooks during server render", () => {
    const originalWindow = globalThis.window;

    vi.stubGlobal("window", undefined);

    try {
      expect(() => renderToString(<SidebarUserMenu />)).not.toThrow();
    } finally {
      vi.stubGlobal("window", originalWindow);
    }
  });
});
