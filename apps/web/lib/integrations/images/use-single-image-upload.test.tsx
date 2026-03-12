/**
 * @vitest-environment happy-dom
 */
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const toastMock = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
}));
const uploadImageMock = vi.hoisted(() => vi.fn());
const validateImageFileMock = vi.hoisted(() => vi.fn());
const { MockUploadImageError } = vi.hoisted(() => {
  class MockUploadImageError extends Error {
    status?: number;

    constructor(message: string, status?: number) {
      super(message);
      this.status = status;
    }
  }

  return { MockUploadImageError };
});

vi.mock("sonner", () => ({ toast: toastMock }));
vi.mock("@/lib/integrations/images/upload-client", () => ({
  MAX_IMAGE_SIZE_BYTES: 10 * 1024 * 1024,
  UploadImageError: MockUploadImageError,
  isUploadImageAuthError: (error: unknown) =>
    error instanceof MockUploadImageError && error.status === 401,
  uploadImage: (...args: Parameters<typeof uploadImageMock>) => uploadImageMock(...args),
  validateImageFile: (...args: Parameters<typeof validateImageFileMock>) =>
    validateImageFileMock(...args),
}));

import { useSingleImageUpload } from "@/lib/integrations/images/use-single-image-upload";

describe("useSingleImageUpload", () => {
  const createObjectURLMock = vi.fn();
  const revokeObjectURLMock = vi.fn();
  let objectUrlCount = 0;

  beforeEach(() => {
    objectUrlCount = 0;
    toastMock.error.mockReset();
    toastMock.success.mockReset();
    uploadImageMock.mockReset();
    validateImageFileMock.mockReset();
    validateImageFileMock.mockReturnValue({ ok: true });
    createObjectURLMock.mockImplementation(() => {
      objectUrlCount += 1;
      return `blob:${objectUrlCount}`;
    });
    revokeObjectURLMock.mockReset();
    vi.stubGlobal(
      "URL",
      Object.assign(URL, {
        createObjectURL: createObjectURLMock,
        revokeObjectURL: revokeObjectURLMock,
      })
    );
  });

  it("keeps the prior image and suppresses the toast when auth handling is delegated", async () => {
    uploadImageMock.mockRejectedValueOnce(new MockUploadImageError("sign in", 401));
    const onAuthError = vi.fn();
    const { result } = renderHook(() =>
      useSingleImageUpload({
        initialImageUrl: "https://cdn.test/original.png",
        onAuthError,
        authErrorMessage: null,
      })
    );

    await act(async () => {
      await result.current.uploadFile(new File(["x"], "reply.png", { type: "image/png" }));
    });

    expect(onAuthError).toHaveBeenCalledTimes(1);
    expect(toastMock.error).not.toHaveBeenCalled();
    expect(result.current.previewSrc).toBe("https://cdn.test/original.png");
    expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:1");
  });

  it("falls back to the backend error message when no auth override is configured", async () => {
    uploadImageMock.mockRejectedValueOnce(new MockUploadImageError("Connect first", 401));
    const { result } = renderHook(() =>
      useSingleImageUpload({
        initialImageUrl: "https://cdn.test/original.png",
      })
    );

    await act(async () => {
      await result.current.uploadFile(new File(["x"], "profile.png", { type: "image/png" }));
    });

    expect(toastMock.error).toHaveBeenCalledWith("Connect first");
    expect(result.current.previewSrc).toBe("https://cdn.test/original.png");
    expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:1");
  });
});
