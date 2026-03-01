import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const { resolveBaseUrlMock, imageResponseCtorMock } = vi.hoisted(() => ({
  resolveBaseUrlMock: vi.fn(),
  imageResponseCtorMock: vi.fn((_element: unknown, _init: unknown) => ({ ok: true })),
}));

vi.mock("@/lib/server/resolve-base-url", () => ({
  resolveBaseUrl: (...args: Parameters<typeof resolveBaseUrlMock>) => resolveBaseUrlMock(...args),
}));

vi.mock("next/og", () => ({
  ImageResponse: function MockImageResponse(element: unknown, init: unknown) {
    return imageResponseCtorMock(element, init);
  },
}));

import { GET } from "./route";

function findImageSrc(node: unknown): string | null {
  if (!node || typeof node !== "object") return null;

  const element = node as {
    type?: unknown;
    props?: {
      src?: unknown;
      children?: unknown;
    };
  };

  if (element.type === "img" && typeof element.props?.src === "string") {
    return element.props.src;
  }

  const children = element.props?.children;
  if (Array.isArray(children)) {
    for (const child of children) {
      const nested = findImageSrc(child);
      if (nested) return nested;
    }
    return null;
  }

  if (children !== undefined) {
    return findImageSrc(children);
  }

  return null;
}

describe("GET /api/og/raise-1-mil", () => {
  beforeEach(() => {
    resolveBaseUrlMock.mockReset();
    resolveBaseUrlMock.mockReturnValue("https://co.build");

    imageResponseCtorMock.mockReset();
    imageResponseCtorMock.mockImplementation((_element: unknown, _init: unknown) => ({ ok: true }));
  });

  it("uses trusted base URL for static assets", async () => {
    const request = new Request("https://evil.example/api/og/raise-1-mil");

    await GET(request as unknown as NextRequest);

    expect(resolveBaseUrlMock).toHaveBeenCalledWith(request.headers);
    expect(imageResponseCtorMock).toHaveBeenCalledTimes(1);

    const [imageTree] = imageResponseCtorMock.mock.calls[0] ?? [];
    expect(findImageSrc(imageTree)).toBe("https://co.build/logo-light.svg");
  });
});
