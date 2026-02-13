/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const toastMock = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
}));
const markSubmissionIneligibleMock = vi.fn();

vi.mock("@/app/(app)/rounds/[id]/actions", () => ({
  markSubmissionIneligible: (...args: Parameters<typeof markSubmissionIneligibleMock>) =>
    markSubmissionIneligibleMock(...args),
}));
vi.mock("sonner", () => ({ toast: toastMock }));

import { useFlagSubmissionRemoval } from "@/lib/hooks/use-flag-submission-removal";

describe("useFlagSubmissionRemoval", () => {
  beforeEach(() => {
    markSubmissionIneligibleMock.mockReset();
    toastMock.error.mockReset();
    toastMock.success.mockReset();
  });

  it("opens, sets reason, cancels", () => {
    const { result } = renderHook(() =>
      useFlagSubmissionRemoval({ ruleId: 1, source: "farcaster", postId: "0xabc" })
    );

    act(() => result.current.open());
    expect(result.current.isOpen).toBe(true);

    act(() => result.current.setReason("spam"));
    expect(result.current.reason).toBe("spam");

    act(() => result.current.cancel());
    expect(result.current.isOpen).toBe(false);
  });

  it("submits and calls success", async () => {
    markSubmissionIneligibleMock.mockResolvedValue({
      ok: true,
      removedTag: false,
      removedSubmission: true,
      requirementsUpdated: true,
      affectedRoundIds: ["1"],
    });

    const onSuccess = vi.fn();
    const { result } = renderHook(() =>
      useFlagSubmissionRemoval({
        ruleId: 1,
        source: "farcaster",
        postId: "0xabc",
        castText: "cast",
        onSuccess,
      })
    );

    act(() => {
      result.current.setReason("spam");
      result.current.setAlsoUpdateRequirements(true);
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(markSubmissionIneligibleMock).toHaveBeenCalled();
    expect(toastMock.success).toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalled();
  });

  it("handles errors and non-ok result", async () => {
    markSubmissionIneligibleMock.mockRejectedValueOnce(new Error("boom"));

    const { result } = renderHook(() =>
      useFlagSubmissionRemoval({ ruleId: 1, source: "x", postId: "123" })
    );

    act(() => result.current.setReason("reason"));

    await act(async () => {
      await result.current.submit();
    });

    expect(toastMock.error).toHaveBeenCalled();

    markSubmissionIneligibleMock.mockResolvedValueOnce({ ok: false, error: "bad" });

    await act(async () => {
      await result.current.submit();
    });

    expect(toastMock.error).toHaveBeenCalledWith("bad");
  });

  it("guards submission when required fields are missing", async () => {
    const { result } = renderHook(() =>
      useFlagSubmissionRemoval({ ruleId: undefined, source: "x", postId: null })
    );

    await act(async () => {
      await result.current.submit();
    });

    expect(markSubmissionIneligibleMock).not.toHaveBeenCalled();
    expect(toastMock.error).not.toHaveBeenCalled();
  });

  it("resets state when target changes and handles success without requirements update", async () => {
    markSubmissionIneligibleMock.mockResolvedValueOnce({
      ok: true,
      removedTag: false,
      removedSubmission: true,
      requirementsUpdated: false,
      affectedRoundIds: ["1"],
    });

    const { result, rerender } = renderHook(
      ({ postId }) => useFlagSubmissionRemoval({ ruleId: 2, source: "x", postId }),
      { initialProps: { postId: "123" } }
    );

    act(() => {
      result.current.open();
      result.current.setReason("spam");
    });
    expect(result.current.isOpen).toBe(true);

    rerender({ postId: "456" });
    expect(result.current.isOpen).toBe(false);

    act(() => {
      result.current.setReason("spam");
    });
    await act(async () => {
      await result.current.submit();
    });

    expect(toastMock.success).toHaveBeenCalledWith("Removed from this round.");
  });
});
