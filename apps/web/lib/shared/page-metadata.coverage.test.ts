import { describe, expect, it } from "vitest";
import { buildPageMetadata } from "./page-metadata";

describe("buildPageMetadata", () => {
  it("returns title and description", () => {
    const metadata = buildPageMetadata({ title: "Cobuild", description: "Desc" });
    expect(metadata.title).toBe("Cobuild");
    expect(metadata.description).toBe("Desc");
  });

  it("omits optional fields when undefined", () => {
    const metadata = buildPageMetadata({ title: "Cobuild" });
    expect(metadata).toEqual({ title: "Cobuild" });
  });

  it("includes robots when provided", () => {
    const metadata = buildPageMetadata({
      title: "Cobuild",
      robots: { index: false, follow: false },
    });
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});
