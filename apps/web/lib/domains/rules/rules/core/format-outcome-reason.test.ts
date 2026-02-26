import { describe, expect, it } from "vitest";
import { formatOutcomeReasonForUser } from "./format-outcome-reason";

describe("rules/core/formatOutcomeReasonForUser", () => {
  it("returns raw input for empty strings", () => {
    expect(formatOutcomeReasonForUser("")).toBe("");
    expect(formatOutcomeReasonForUser("   ")).toBe("");
  });

  it("returns original reason when no missing mention/link markers are present", () => {
    expect(formatOutcomeReasonForUser("Rule passed.")).toBe("Rule passed.");
  });

  it("rewrites missing mention reasons and deduplicates handles case-insensitively", () => {
    expect(
      formatOutcomeReasonForUser(
        "Cast failed: missing mention @CoBuild; missing mention @cobuild; missing mention @alice."
      )
    ).toBe("Post not eligible. Please tag @cobuild and @alice in your post, then submit again.");
  });

  it("rewrites missing link reasons, normalizes display, and deduplicates links in order", () => {
    expect(
      formatOutcomeReasonForUser(
        "Deterministic checks failed: missing link matching https://www.example.com/; missing link matching example.com.; missing link matching https://foo.bar///."
      )
    ).toBe(
      "Post not eligible. Please include a link to example.com and foo.bar in your post, then submit again."
    );
  });

  it("rewrites a single missing link requirement", () => {
    expect(
      formatOutcomeReasonForUser(
        "Deterministic checks failed: missing link matching https://www.example.com/path///."
      )
    ).toBe(
      "Post not eligible. Please include a link to example.com/path in your post, then submit again."
    );
  });

  it("handles mention + multiple links with natural list grammar", () => {
    expect(
      formatOutcomeReasonForUser(
        "Cast is missing required elements: missing mention @alice; missing link matching a.com; missing link matching b.com; missing link matching c.com."
      )
    ).toBe(
      "Post not eligible. Please tag @alice and include a link to a.com, b.com, and c.com in your post, then submit again."
    );
  });

  it("keeps original reason if markers exist but no parsable mentions or link patterns are found", () => {
    expect(
      formatOutcomeReasonForUser("Deterministic checks failed: missing link and missing mention.")
    ).toBe("Deterministic checks failed: missing link and missing mention.");
  });

  it("keeps original reason when link markers normalize to empty patterns", () => {
    expect(
      formatOutcomeReasonForUser("Deterministic checks failed: missing link matching ...")
    ).toBe("Deterministic checks failed: missing link matching ...");
  });
});
