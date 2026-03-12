/**
 * @vitest-environment happy-dom
 */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useSettingsPersistence } from "./use-settings-persistence";

type NumberState = { value: number };

describe("useSettingsPersistence", () => {
  it("keeps local draft state until the initial state reference changes", () => {
    const initialState = { value: 1 };

    const { result, rerender } = renderHook(
      ({ state }: { state: NumberState }) =>
        useSettingsPersistence<NumberState, number, number>({
          enabled: true,
          initialState: state,
          getPayload: ({ baseline, draft }) =>
            baseline.value === draft.value ? null : draft.value,
          save: async (payload) => payload,
        }),
      {
        initialProps: { state: initialState },
      }
    );

    act(() => {
      result.current.setDraft({ value: 2 });
    });

    expect(result.current.baseline.value).toBe(1);
    expect(result.current.draft.value).toBe(2);

    rerender({ state: initialState });
    expect(result.current.draft.value).toBe(2);

    rerender({ state: { value: 3 } });
    expect(result.current.baseline.value).toBe(3);
    expect(result.current.draft.value).toBe(3);
  });

  it.skip("clears success after the configured duration when a save succeeds", async () => {
    const save = vi.fn(async (payload: number) => ({ value: payload }));

    const { result } = renderHook(() =>
      useSettingsPersistence<NumberState, number, NumberState>({
        enabled: true,
        initialState: { value: 1 },
        getPayload: ({ baseline, draft }) => (baseline.value === draft.value ? null : draft.value),
        save,
        successDurationMs: 30,
        applySuccess: (response) => ({
          baseline: response,
          draft: response,
          success: true,
        }),
      })
    );

    act(() => {
      result.current.setDraft({ value: 2 });
    });

    expect(save).not.toHaveBeenCalled();

    let commitPromise: Promise<boolean> | undefined;
    act(() => {
      commitPromise = result.current.commit();
    });

    if (!commitPromise) {
      throw new Error("Expected commit promise");
    }
    await commitPromise;

    await act(async () => {
      await Promise.resolve();
    });

    expect(save).toHaveBeenCalledTimes(1);

    expect(result.current.baseline.value).toBe(2);
    expect(result.current.draft.value).toBe(2);
    expect(result.current.success).toBe(true);

    await new Promise((resolve) => {
      setTimeout(resolve, 30);
    });
    expect(result.current.success).toBe(false);
  });

  it.skip("does not resubmit unchanged drafts after a failed save", async () => {
    const save = vi.fn(async () => {
      throw new Error("save failed");
    });

    const { result } = renderHook(() =>
      useSettingsPersistence<NumberState, number, never>({
        enabled: true,
        initialState: { value: 1 },
        getPayload: ({ baseline, draft }) => (baseline.value === draft.value ? null : draft.value),
        save,
      })
    );

    act(() => {
      result.current.setDraft({ value: 2 });
    });

    let commitPromise: Promise<boolean> | undefined;
    act(() => {
      commitPromise = result.current.commit();
    });

    if (!commitPromise) {
      throw new Error("Expected commit promise");
    }
    await commitPromise;

    await act(async () => {
      await Promise.resolve();
    });

    expect(save).toHaveBeenCalledTimes(1);

    expect(result.current.error).toBe("save failed");

    expect(save).toHaveBeenCalledTimes(1);
  });

  it.skip("rolls back optimistic manual commits when save fails", async () => {
    let rejectSave: ((error: Error) => void) | undefined;
    const save = vi.fn(
      () =>
        new Promise<never>((_resolve, reject) => {
          rejectSave = reject;
        })
    );

    const { result } = renderHook(() =>
      useSettingsPersistence<string[], string[], never>({
        enabled: true,
        initialState: ["defi"],
        initialError: "initial fetch failed",
        clearErrorOnSaveStart: false,
        getPayload: ({ baseline, draft }) =>
          baseline.length === draft.length &&
          baseline.every((value, index) => value === draft[index])
            ? null
            : draft,
        save,
        applyError: (_error, context) => ({
          baseline: context.baseline,
          draft: context.baseline,
          error: context.previousError,
          success: false,
        }),
      })
    );

    let commitPromise: Promise<boolean> | undefined;
    act(() => {
      commitPromise = result.current.commit(["defi", "meme"]);
    });

    expect(result.current.draft).toEqual(["defi", "meme"]);
    expect(result.current.saving).toBe(true);

    rejectSave?.(new Error("save failed"));

    if (!commitPromise) {
      throw new Error("Expected commit promise");
    }
    const didSave = await commitPromise;

    await act(async () => {
      await Promise.resolve();
    });

    expect(didSave).toBe(false);
    expect(result.current.baseline).toEqual(["defi"]);
    expect(result.current.draft).toEqual(["defi"]);
    expect(result.current.error).toBe("initial fetch failed");
    expect(result.current.saving).toBe(false);
  });

  it.skip("preserves newer draft edits when an in-flight save resolves", async () => {
    let resolveSave: ((value: { value: number }) => void) | undefined;
    const save = vi.fn(
      () =>
        new Promise<{ value: number }>((resolve) => {
          resolveSave = resolve;
        })
    );

    const { result } = renderHook(() =>
      useSettingsPersistence<NumberState, number, { value: number }>({
        enabled: true,
        initialState: { value: 1 },
        getPayload: ({ baseline, draft }) => (baseline.value === draft.value ? null : draft.value),
        save,
        applySuccess: (response) => ({
          baseline: response,
          draft: response,
        }),
      })
    );

    act(() => {
      result.current.setDraft({ value: 2 });
    });

    let commitPromise: Promise<boolean> | undefined;
    act(() => {
      commitPromise = result.current.commit();
    });

    expect(result.current.saving).toBe(true);

    act(() => {
      result.current.setDraft({ value: 3 });
    });

    await act(async () => {
      resolveSave?.({ value: 2 });
      if (!commitPromise) {
        throw new Error("Expected commit promise");
      }
      await commitPromise;
    });

    expect(result.current.baseline.value).toBe(2);
    expect(result.current.draft.value).toBe(3);
    expect(result.current.saving).toBe(false);
  });
});
