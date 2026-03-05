import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const { resolveBaseUrlMock, getGoalOverviewDataMock, getGoalCardsMock, imageResponseCtorMock } =
  vi.hoisted(() => ({
    resolveBaseUrlMock: vi.fn(),
    getGoalOverviewDataMock: vi.fn(),
    getGoalCardsMock: vi.fn(),
    imageResponseCtorMock: vi.fn((_element: unknown, _init: unknown) => ({ ok: true })),
  }));

vi.mock("@/lib/server/resolve-base-url", () => ({
  resolveBaseUrl: (...args: Parameters<typeof resolveBaseUrlMock>) => resolveBaseUrlMock(...args),
}));

vi.mock("@/lib/domains/goals/goal-data", () => ({
  getGoalOverviewData: (...args: Parameters<typeof getGoalOverviewDataMock>) =>
    getGoalOverviewDataMock(...args),
  getGoalCards: (...args: Parameters<typeof getGoalCardsMock>) => getGoalCardsMock(...args),
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

describe("GET /api/og/goal", () => {
  beforeEach(() => {
    resolveBaseUrlMock.mockReset();
    resolveBaseUrlMock.mockReturnValue("https://co.build");

    getGoalOverviewDataMock.mockReset();
    getGoalOverviewDataMock.mockResolvedValue({
      progressTitle: "Raise $1M by Jun 30, 2026",
      raised: 125000,
      target: 1000000,
    });
    getGoalCardsMock.mockReset();
    getGoalCardsMock.mockResolvedValue([]);

    imageResponseCtorMock.mockReset();
    imageResponseCtorMock.mockImplementation((_element: unknown, _init: unknown) => ({ ok: true }));
  });

  it("reads the goalAddress query and uses trusted base URL assets", async () => {
    const request = new Request("https://evil.example/api/og/goal?goalAddress=0xabc");

    await GET(request as unknown as NextRequest);

    expect(getGoalOverviewDataMock).toHaveBeenCalledWith("0xabc");
    expect(getGoalCardsMock).not.toHaveBeenCalled();
    expect(resolveBaseUrlMock).toHaveBeenCalledWith(request.headers);
    expect(imageResponseCtorMock).toHaveBeenCalledTimes(1);

    const [imageTree] = imageResponseCtorMock.mock.calls[0] ?? [];
    expect(findImageSrc(imageTree)).toBe("https://co.build/logo-light.svg");
  });
});
