/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useCommandEnter } from "@/lib/hooks/use-command-enter";

type DomKeyboardEvent = globalThis.KeyboardEvent;

function buildEvent(params: Partial<ReactKeyboardEvent<HTMLElement>>) {
  const nativeEvent = { isComposing: false } as Partial<DomKeyboardEvent> as DomKeyboardEvent;
  return {
    key: "Enter",
    metaKey: false,
    ctrlKey: false,
    nativeEvent,
    preventDefault: vi.fn(),
    ...params,
  } as Partial<ReactKeyboardEvent<HTMLElement>> as ReactKeyboardEvent<HTMLElement>;
}

describe("useCommandEnter", () => {
  it("fires on meta+enter", () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() => useCommandEnter(onSubmit, true));
    const event = buildEvent({ metaKey: true });

    act(() => result.current(event));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
  });

  it("fires on ctrl+enter", () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() => useCommandEnter(onSubmit, true));
    const event = buildEvent({ ctrlKey: true });

    act(() => result.current(event));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("ignores when disabled or composing", () => {
    const onSubmit = vi.fn();
    const { result, rerender } = renderHook(({ enabled }) => useCommandEnter(onSubmit, enabled), {
      initialProps: { enabled: false },
    });

    act(() => result.current(buildEvent({ metaKey: true })));
    expect(onSubmit).not.toHaveBeenCalled();

    rerender({ enabled: true });
    act(() =>
      result.current(
        buildEvent({
          metaKey: true,
          nativeEvent: { isComposing: true } as Partial<DomKeyboardEvent> as DomKeyboardEvent,
        })
      )
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
