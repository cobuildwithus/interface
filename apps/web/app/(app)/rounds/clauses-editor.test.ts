import { describe, expect, it } from "vitest";

import { serializeClausesDraft } from "@/lib/domains/rules/rules/core/drafts";

describe("serializeClausesDraft", () => {
  it("rejects duplicate clause types per platform", () => {
    const res = serializeClausesDraft({
      farcaster: [
        { id: "1", type: "mentionsAll", raw: "123" },
        { id: "2", type: "mentionsAll", raw: "456" },
      ],
      x: [],
    });

    expect(res.ok).toBe(false);
    if (res.ok) throw new Error("expected error");
    expect(res.error).toContain("Duplicate clause type");
  });
});
