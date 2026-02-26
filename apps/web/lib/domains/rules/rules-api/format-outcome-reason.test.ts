import { describe, expect, it } from "vitest";
import { formatOutcomeReasonForUser } from "./format-outcome-reason";

describe("formatOutcomeReasonForUser", () => {
  it("rewrites missing mention reasons into an actionable instruction", () => {
    expect(
      formatOutcomeReasonForUser("Cast is missing required elements: missing mention @cobuild.")
    ).toBe("Post not eligible. Please tag @cobuild in your post, then submit again.");
  });

  it("rewrites missing link reasons into an actionable instruction", () => {
    expect(
      formatOutcomeReasonForUser(
        "Deterministic checks failed: missing link matching https://example.com."
      )
    ).toBe(
      "Post not eligible. Please include a link to example.com in your post, then submit again."
    );
  });

  it("handles missing mention + link together", () => {
    expect(
      formatOutcomeReasonForUser(
        "Cast is missing required elements: missing mention @cobuild; missing link matching justco.build."
      )
    ).toBe(
      "Post not eligible. Please tag @cobuild and include a link to justco.build in your post, then submit again."
    );
  });

  it("returns the original reason for unrelated messages", () => {
    expect(formatOutcomeReasonForUser("Rule passed.")).toBe("Rule passed.");
  });
});
