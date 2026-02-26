import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  getImageRejectionMessage,
  isUploadImageAuthError,
  uploadImage,
  UploadImageError,
  validateImageFile,
} from "@/lib/integrations/images/upload-client";

const createMockXMLHttpRequest = () => {
  type UploadProgress = { lengthComputable: boolean; loaded: number; total: number };
  type Listener = (event?: UploadProgress) => void;
  type UploadResponse = { url?: string; error?: string } | null;

  class MockUploadTarget {
    private listeners: Record<string, Listener[]> = {};
    onprogress?: Listener;

    addEventListener(event: string, cb: Listener) {
      (this.listeners[event] ??= []).push(cb);
    }

    emit(event: string, payload?: UploadProgress) {
      if (event === "progress") {
        this.onprogress?.(payload);
      }
      (this.listeners[event] ?? []).forEach((cb) => cb(payload));
    }
  }

  class MockXMLHttpRequest {
    static instances: MockXMLHttpRequest[] = [];

    upload = new MockUploadTarget();
    responseType = "";
    response: UploadResponse = null;
    responseText = "";
    status = 0;
    open = vi.fn();
    send = vi.fn();
    private listeners: Record<string, Listener[]> = {};

    constructor() {
      MockXMLHttpRequest.instances.push(this);
    }

    addEventListener(event: string, cb: Listener) {
      (this.listeners[event] ??= []).push(cb);
    }

    emit(event: string) {
      (this.listeners[event] ?? []).forEach((cb) => cb());
    }
  }

  return MockXMLHttpRequest;
};

describe("validateImageFile", () => {
  it("accepts valid image types within size", () => {
    const file = new File(["ok"], "ok.png", { type: ACCEPTED_IMAGE_TYPES[0] });

    expect(validateImageFile(file)).toEqual({ ok: true });
  });

  it("rejects invalid image types", () => {
    const file = new File(["nope"], "nope.txt", { type: "text/plain" });

    expect(validateImageFile(file)).toEqual({
      ok: false,
      code: "file-invalid-type",
      message: "Unsupported file type.",
    });
  });

  it("rejects files that exceed the size limit", () => {
    const file = new File([new Uint8Array(MAX_IMAGE_SIZE_BYTES + 1)], "big.png", {
      type: ACCEPTED_IMAGE_TYPES[0],
    });

    expect(validateImageFile(file)).toEqual({
      ok: false,
      code: "file-too-large",
      message: "File too large. Max 10MB.",
    });
  });
});

describe("getImageRejectionMessage", () => {
  it("returns messages for known codes", () => {
    expect(getImageRejectionMessage("file-too-large")).toBe("File too large. Max 10MB.");
    expect(getImageRejectionMessage("file-invalid-type")).toBe("Unsupported file type.");
  });

  it("returns null for unknown codes", () => {
    expect(getImageRejectionMessage("nope")).toBeNull();
  });
});

describe("isUploadImageAuthError", () => {
  it("detects auth errors by status", () => {
    expect(isUploadImageAuthError(new UploadImageError("nope", 401))).toBe(true);
    expect(isUploadImageAuthError(new UploadImageError("nope", 500))).toBe(false);
    expect(isUploadImageAuthError(new Error("nope"))).toBe(false);
  });
});

describe("uploadImage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uploads and returns the URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: "https://example.com/image.png" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await uploadImage(new File(["ok"], "ok.png", { type: "image/png" }));

    expect(result).toBe("https://example.com/image.png");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/images/upload",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("throws when upload fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "nope" }),
      })
    );

    await expect(uploadImage(new File(["ok"], "ok.png", { type: "image/png" }))).rejects.toThrow(
      "nope"
    );
  });

  it("throws a default error when response is missing a url", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 500,
        json: () => Promise.reject(new Error("bad json")),
      })
    );

    await expect(uploadImage(new File(["ok"], "ok.png", { type: "image/png" }))).rejects.toThrow(
      "Failed to upload image."
    );
  });

  it("uploads via XHR with progress events", async () => {
    const progressSpy = vi.fn();
    const MockXMLHttpRequest = createMockXMLHttpRequest();
    vi.stubGlobal("XMLHttpRequest", MockXMLHttpRequest);

    const promise = uploadImage(new File(["ok"], "ok.png", { type: "image/png" }), {
      onProgress: progressSpy,
    });

    const request = MockXMLHttpRequest.instances[0];
    request.upload.emit("progress", { lengthComputable: false, loaded: 1, total: 2 });
    request.upload.emit("progress", { lengthComputable: true, loaded: 5, total: 10 });
    request.upload.emit("progress", { lengthComputable: true, loaded: 5, total: 0 });
    request.status = 201;
    request.response = { url: "https://example.com/image.png" };
    request.emit("load");

    await expect(promise).resolves.toBe("https://example.com/image.png");
    expect(progressSpy).toHaveBeenCalledTimes(3);
    expect(progressSpy).toHaveBeenNthCalledWith(1, 0.5);
    expect(progressSpy).toHaveBeenNthCalledWith(2, 0.5);
    expect(progressSpy).toHaveBeenNthCalledWith(3, 1);
  });

  it("parses responseText and surfaces upload errors", async () => {
    const MockXMLHttpRequest = createMockXMLHttpRequest();
    vi.stubGlobal("XMLHttpRequest", MockXMLHttpRequest);

    const promise = uploadImage(new File(["ok"], "ok.png", { type: "image/png" }), {
      onProgress: vi.fn(),
    });

    const request = MockXMLHttpRequest.instances[0];
    request.status = 422;
    request.responseText = JSON.stringify({ error: "nope" });
    request.emit("load");

    await expect(promise).rejects.toThrow("nope");
  });

  it("returns a default error when responseText is invalid JSON", async () => {
    const MockXMLHttpRequest = createMockXMLHttpRequest();
    vi.stubGlobal("XMLHttpRequest", MockXMLHttpRequest);

    const promise = uploadImage(new File(["ok"], "ok.png", { type: "image/png" }), {
      onProgress: vi.fn(),
    });

    const request = MockXMLHttpRequest.instances[0];
    request.status = 500;
    request.responseText = "{bad-json";
    request.emit("load");

    await expect(promise).rejects.toThrow("Failed to upload image.");
  });

  it("rejects on XHR error events", async () => {
    const MockXMLHttpRequest = createMockXMLHttpRequest();
    vi.stubGlobal("XMLHttpRequest", MockXMLHttpRequest);

    const promise = uploadImage(new File(["ok"], "ok.png", { type: "image/png" }), {
      onProgress: vi.fn(),
    });

    const request = MockXMLHttpRequest.instances[0];
    request.status = 0;
    request.emit("error");

    await expect(promise).rejects.toThrow("Failed to upload image.");
  });
});
