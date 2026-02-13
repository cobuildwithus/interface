/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useIsMobile } from "@/lib/hooks/use-mobile";

type MatchMediaListener = (event?: MediaQueryListEvent) => void;

describe("useIsMobile", () => {
  const listeners = new Set<MatchMediaListener>();

  beforeEach(() => {
    listeners.clear();
    Object.defineProperty(window, "innerWidth", { writable: true, value: 500 });
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        media: query,
        matches: window.innerWidth < 768,
        addEventListener: (_event: string, listener: MatchMediaListener) => {
          listeners.add(listener);
        },
        removeEventListener: (_event: string, listener: MatchMediaListener) => {
          listeners.delete(listener);
        },
      })),
    });
  });

  it("reflects viewport width and updates on change", async () => {
    const { result } = renderHook(() => useIsMobile());

    await waitFor(() => expect(result.current).toBe(true));

    act(() => {
      window.innerWidth = 1024;
      listeners.forEach((listener) => listener());
    });

    await waitFor(() => expect(result.current).toBe(false));
  });
});
