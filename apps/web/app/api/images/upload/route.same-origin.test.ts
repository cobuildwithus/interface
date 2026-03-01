import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionMock, validateImageFileMock, isSupportedImageBytesMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  validateImageFileMock: vi.fn(),
  isSupportedImageBytesMock: vi.fn(),
}));

vi.mock("@/lib/domains/auth/session", () => ({
  getSession: (...args: Parameters<typeof getSessionMock>) => getSessionMock(...args),
}));

vi.mock("@/lib/integrations/images/upload-rules", () => ({
  validateImageFile: (...args: Parameters<typeof validateImageFileMock>) =>
    validateImageFileMock(...args),
  isSupportedImageBytes: (...args: Parameters<typeof isSupportedImageBytesMock>) =>
    isSupportedImageBytesMock(...args),
  getImageRejectionMessage: () => "Unsupported file type.",
}));

import { POST } from "./route";

const baseUrl = "http://localhost";
const fetchMock = vi.fn();

describe("POST /api/images/upload same-origin guards", () => {
  beforeEach(() => {
    getSessionMock.mockReset();
    validateImageFileMock.mockReset();
    isSupportedImageBytesMock.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("rejects requests flagged as cross-site by sec-fetch-site", async () => {
    const formDataSpy = vi.spyOn(Request.prototype, "formData");

    const response = await POST(
      new Request(`${baseUrl}/api/images/upload`, {
        method: "POST",
        headers: {
          origin: baseUrl,
          "sec-fetch-site": "cross-site",
        },
        body: new FormData(),
      })
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Forbidden." });
    expect(formDataSpy).not.toHaveBeenCalled();
    expect(getSessionMock).not.toHaveBeenCalled();
    expect(validateImageFileMock).not.toHaveBeenCalled();
    expect(isSupportedImageBytesMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects requests with cross-origin referer when origin header is absent", async () => {
    const formDataSpy = vi.spyOn(Request.prototype, "formData");

    const response = await POST(
      new Request(`${baseUrl}/api/images/upload`, {
        method: "POST",
        headers: {
          referer: "https://evil.example/upload",
        },
        body: new FormData(),
      })
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Forbidden." });
    expect(formDataSpy).not.toHaveBeenCalled();
    expect(getSessionMock).not.toHaveBeenCalled();
    expect(validateImageFileMock).not.toHaveBeenCalled();
    expect(isSupportedImageBytesMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects malformed referer values when origin header is absent", async () => {
    const formDataSpy = vi.spyOn(Request.prototype, "formData");

    const response = await POST(
      new Request(`${baseUrl}/api/images/upload`, {
        method: "POST",
        headers: {
          referer: "://bad-url",
        },
        body: new FormData(),
      })
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Forbidden." });
    expect(formDataSpy).not.toHaveBeenCalled();
    expect(getSessionMock).not.toHaveBeenCalled();
    expect(validateImageFileMock).not.toHaveBeenCalled();
    expect(isSupportedImageBytesMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects requests when both origin and referer headers are missing", async () => {
    const formDataSpy = vi.spyOn(Request.prototype, "formData");

    const response = await POST(
      new Request(`${baseUrl}/api/images/upload`, {
        method: "POST",
        body: new FormData(),
      })
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Forbidden." });
    expect(formDataSpy).not.toHaveBeenCalled();
    expect(getSessionMock).not.toHaveBeenCalled();
    expect(validateImageFileMock).not.toHaveBeenCalled();
    expect(isSupportedImageBytesMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
