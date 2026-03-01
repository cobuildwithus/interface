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

const originalEnv = { ...process.env };
const baseUrl = "http://localhost";
const fetchMock = vi.fn();

describe("POST /api/images/upload", () => {
  beforeEach(() => {
    getSessionMock.mockReset();
    validateImageFileMock.mockReset();
    isSupportedImageBytesMock.mockReset();
    fetchMock.mockReset();
    isSupportedImageBytesMock.mockReturnValue(true);

    process.env = {
      ...originalEnv,
      CLOUDFLARE_IMAGES_ACCOUNT_ID: "account-id",
      CLOUDFLARE_IMAGES_API_TOKEN: "token",
      CLOUDFLARE_IMAGES_VARIANT: "profile",
    };

    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("allows same-origin uploads", async () => {
    getSessionMock.mockResolvedValue({ address: "0x0000000000000000000000000000000000000001" });
    validateImageFileMock.mockReturnValue({ ok: true });

    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          result: {
            id: "img_1",
            variants: [
              "https://imagedelivery.net/example/default",
              "https://imagedelivery.net/example/profile",
            ],
          },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        }
      )
    );

    const formData = new FormData();
    formData.append("file", new File(["image"], "avatar.png", { type: "image/png" }));

    const response = await POST(
      new Request(`${baseUrl}/api/images/upload`, {
        method: "POST",
        headers: { origin: baseUrl },
        body: formData,
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      url: "https://imagedelivery.net/example/profile",
      id: "img_1",
    });
    expect(getSessionMock).toHaveBeenCalledTimes(1);
    expect(validateImageFileMock).toHaveBeenCalledTimes(1);
    expect(isSupportedImageBytesMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects cross-origin requests before auth or form parsing", async () => {
    const formDataSpy = vi.spyOn(Request.prototype, "formData");

    const response = await POST(
      new Request(`${baseUrl}/api/images/upload`, {
        method: "POST",
        headers: { origin: "https://evil.example" },
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

  it("rejects uploads when file bytes do not match the declared mime type", async () => {
    getSessionMock.mockResolvedValue({ address: "0x0000000000000000000000000000000000000001" });
    validateImageFileMock.mockReturnValue({ ok: true });
    isSupportedImageBytesMock.mockReturnValue(false);

    const formData = new FormData();
    formData.append("file", new File(["<svg>"], "avatar.png", { type: "image/png" }));

    const response = await POST(
      new Request(`${baseUrl}/api/images/upload`, {
        method: "POST",
        headers: { origin: baseUrl },
        body: formData,
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Unsupported file type." });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
