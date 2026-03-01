import { describe, expect, it } from "vitest";

import {
  IMAGE_ACCEPT_ATTRIBUTE,
  MAX_IMAGE_SIZE_BYTES,
  isSupportedImageBytes,
  validateImageFile,
} from "@/lib/integrations/images/upload-rules";

describe("validateImageFile (server rules)", () => {
  it("rejects svg mime types", () => {
    const result = validateImageFile({
      type: "image/svg+xml",
      size: 128,
    });

    expect(result).toEqual({
      ok: false,
      code: "file-invalid-type",
      message: "Unsupported file type.",
    });
  });

  it("accepts allowed mime types within the size limit", () => {
    const result = validateImageFile({
      type: "image/png",
      size: MAX_IMAGE_SIZE_BYTES,
    });

    expect(result).toEqual({ ok: true });
  });

  it("does not advertise svg in the accept attribute", () => {
    expect(IMAGE_ACCEPT_ATTRIBUTE).not.toContain("image/svg+xml");
  });

  it("rejects spoofed png types when bytes do not match a png signature", () => {
    const spoofedSvgBytes = new TextEncoder().encode(
      '<svg xmlns="http://www.w3.org/2000/svg"></svg>'
    );
    expect(isSupportedImageBytes("image/png", spoofedSvgBytes)).toBe(false);
  });

  it("accepts png files with valid png signatures", () => {
    const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(isSupportedImageBytes("image/png", pngHeader)).toBe(true);
  });
});
