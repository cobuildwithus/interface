/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCmdEnter } from "@/lib/hooks/use-cmd-enter";

function dispatchCommandEnter(options: { metaKey?: boolean; ctrlKey?: boolean } = {}) {
  const event = new KeyboardEvent("keydown", {
    key: "Enter",
    metaKey: options.metaKey ?? false,
    ctrlKey: options.ctrlKey ?? false,
  });
  document.dispatchEvent(event);
}

describe("useCmdEnter", () => {
  it("fires on meta+enter", () => {
    const onSubmit = vi.fn();
    renderHook(() => useCmdEnter(onSubmit, true));

    act(() => dispatchCommandEnter({ metaKey: true }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("fires on ctrl+enter", () => {
    const onSubmit = vi.fn();
    renderHook(() => useCmdEnter(onSubmit, true));

    act(() => dispatchCommandEnter({ ctrlKey: true }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("does not fire when disabled", () => {
    const onSubmit = vi.fn();
    renderHook(() => useCmdEnter(onSubmit, false));

    act(() => dispatchCommandEnter({ metaKey: true }));

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
