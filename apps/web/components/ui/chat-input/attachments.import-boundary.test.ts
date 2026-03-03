import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const testFilePath = fileURLToPath(import.meta.url);
const testDir = path.dirname(testFilePath);
const sourcePath = path.join(testDir, "attachments.tsx");

describe("chat input attachments import boundary", () => {
  it("imports message attachments directly instead of the message barrel", () => {
    const source = readFileSync(sourcePath, "utf8");

    expect(source).toMatch(/from\s+["']@\/components\/ai-elements\/message\/attachments["']/);
    expect(source).not.toMatch(/from\s+["']@\/components\/ai-elements\/message["']/);
  });
});
