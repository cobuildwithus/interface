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

    const disabledEvent = buildEvent({ metaKey: true });
    act(() => result.current(disabledEvent));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(disabledEvent.preventDefault).not.toHaveBeenCalled();

    rerender({ enabled: true });
    const composingEvent = buildEvent({
      metaKey: true,
      nativeEvent: { isComposing: true } as Partial<DomKeyboardEvent> as DomKeyboardEvent,
    });
    act(() => result.current(composingEvent));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(composingEvent.preventDefault).not.toHaveBeenCalled();
  });

  it("ignores non-enter keys and enter without modifiers", () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() => useCommandEnter(onSubmit));

    const nonEnterEvent = buildEvent({ key: "a", metaKey: true });
    act(() => result.current(nonEnterEvent));

    const missingModifierEvent = buildEvent({ key: "Enter", metaKey: false, ctrlKey: false });
    act(() => result.current(missingModifierEvent));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(nonEnterEvent.preventDefault).not.toHaveBeenCalled();
    expect(missingModifierEvent.preventDefault).not.toHaveBeenCalled();
  });

  it("uses latest submit callback after rerender", () => {
    const firstSubmit = vi.fn();
    const secondSubmit = vi.fn();

    const { result, rerender } = renderHook(({ onSubmit }) => useCommandEnter(onSubmit, true), {
      initialProps: { onSubmit: firstSubmit },
    });

    act(() => result.current(buildEvent({ metaKey: true })));
    expect(firstSubmit).toHaveBeenCalledTimes(1);
    expect(secondSubmit).not.toHaveBeenCalled();

    rerender({ onSubmit: secondSubmit });
    act(() => result.current(buildEvent({ ctrlKey: true })));

    expect(firstSubmit).toHaveBeenCalledTimes(1);
    expect(secondSubmit).toHaveBeenCalledTimes(1);
  });
});
