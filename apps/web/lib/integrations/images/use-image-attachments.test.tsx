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

import { TOTAL_IMAGE_BYTES_EXCEEDED_MESSAGE } from "@/lib/integrations/images/upload-flow";
import { useImageAttachments } from "@/lib/integrations/images/use-image-attachments";

const createImageFile = (name: string, size: number) => {
  const file = new File(["x"], name, { type: "image/png" });
  Object.defineProperty(file, "size", { configurable: true, value: size });
  return file;
};

describe("useImageAttachments", () => {
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
    uploadImageMock.mockImplementation(async (file: File) => `https://cdn.test/${file.name}`);
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

  it("enforces the shared total-byte limit before starting a second upload", async () => {
    const { result } = renderHook(() =>
      useImageAttachments({
        uploadMode: "sequential",
      })
    );

    await act(async () => {
      await result.current.queueFiles([
        createImageFile("one.png", 6_000_000),
        createImageFile("two.png", 6_000_000),
      ]);
    });

    expect(uploadImageMock).toHaveBeenCalledTimes(1);
    expect(toastMock.error).toHaveBeenCalledWith(TOTAL_IMAGE_BYTES_EXCEEDED_MESSAGE);
    expect(result.current.attachments).toHaveLength(1);
    expect(result.current.attachments[0]).toMatchObject({
      filename: "one.png",
      isLocal: false,
      progress: 1,
      status: "ready",
      url: "https://cdn.test/one.png",
    });
    expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:1");
  });

  it("stops the sequential queue on auth errors and removes the pending preview", async () => {
    uploadImageMock
      .mockRejectedValueOnce(new MockUploadImageError("sign in", 401))
      .mockResolvedValueOnce("https://cdn.test/two.png");
    const onAuthError = vi.fn();
    const { result } = renderHook(() =>
      useImageAttachments({
        onAuthError,
        stopOnAuthError: true,
        uploadMode: "sequential",
      })
    );

    await act(async () => {
      await result.current.queueFiles([
        createImageFile("one.png", 1_000),
        createImageFile("two.png", 1_000),
      ]);
    });

    expect(uploadImageMock).toHaveBeenCalledTimes(1);
    expect(onAuthError).toHaveBeenCalledTimes(1);
    expect(toastMock.error).not.toHaveBeenCalled();
    expect(result.current.attachments).toEqual([]);
    expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:1");
  });
});
