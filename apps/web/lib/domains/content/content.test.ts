import { describe, expect, it } from "vitest";
import {
  beliefs,
  billOfRights,
  charter,
  manifesto,
  systemPrompt,
} from "@/lib/domains/content/content";

describe("content exports", () => {
  it("provides non-empty strings", () => {
    const values = [manifesto, beliefs, billOfRights, systemPrompt, charter];
    for (const value of values) {
      expect(typeof value).toBe("string");
      expect(value.trim().length).toBeGreaterThan(0);
    }
  });
});
