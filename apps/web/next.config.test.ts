import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { buildContentSecurityPolicy } from "./next.config";

const getDirective = (policy: string, directive: string) =>
  policy
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${directive} `));

describe("buildContentSecurityPolicy", () => {
  it("includes unsafe-eval in development only", () => {
    const developmentPolicy = buildContentSecurityPolicy({ nodeEnv: "development" });
    const productionPolicy = buildContentSecurityPolicy({ nodeEnv: "production" });

    expect(getDirective(developmentPolicy, "script-src")).toContain("'unsafe-eval'");
    expect(getDirective(productionPolicy, "script-src")).not.toContain("'unsafe-eval'");
  });

  it("keeps localhost callback origins in production connect-src", () => {
    const productionPolicy = buildContentSecurityPolicy({ nodeEnv: "production" });
    const connectSrc = getDirective(productionPolicy, "connect-src");

    expect(connectSrc).toContain("http://localhost:*");
    expect(connectSrc).toContain("http://127.0.0.1:*");
    expect(connectSrc).toContain("http://[::1]:*");
  });

  it("locks key embedding directives in production", () => {
    const productionPolicy = buildContentSecurityPolicy({ nodeEnv: "production" });

    expect(getDirective(productionPolicy, "object-src")).toBe("object-src 'none'");
    expect(getDirective(productionPolicy, "base-uri")).toBe("base-uri 'self'");
    expect(getDirective(productionPolicy, "frame-ancestors")).toBe(
      "frame-ancestors 'self' https://auth.privy.io"
    );
  });
});

const RUNTIME_SCRIPT_FILE_PATTERN = /\.(?:c|m)?js$/;
const EVAL_LIKE_PATTERN = /\b(?:new\s+Function|Function|eval)\s*\(/;

const STREAMDOWN_RUNTIME_PACKAGES = [
  { name: "streamdown", resolveFrom: "streamdown" },
  { name: "@streamdown/cjk", resolveFrom: "@streamdown/cjk" },
  { name: "@streamdown/code", resolveFrom: "@streamdown/code" },
  { name: "@streamdown/math", resolveFrom: "@streamdown/math" },
  { name: "@streamdown/mermaid", resolveFrom: "@streamdown/mermaid" },
] as const;

const collectRuntimeScriptFiles = (dir: string): string[] => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const resolved = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectRuntimeScriptFiles(resolved));
      continue;
    }
    if (entry.isFile() && RUNTIME_SCRIPT_FILE_PATTERN.test(resolved)) {
      files.push(resolved);
    }
  }

  return files;
};

describe("streamdown package runtime", () => {
  it("does not include eval-like constructs in streamdown runtime packages", () => {
    const offenders: string[] = [];

    for (const runtimePackage of STREAMDOWN_RUNTIME_PACKAGES) {
      const packageEntryPath = fileURLToPath(import.meta.resolve(runtimePackage.resolveFrom));
      const scriptRoot = path.dirname(packageEntryPath);
      const scriptFiles = collectRuntimeScriptFiles(scriptRoot);

      expect(scriptFiles.length).toBeGreaterThan(0);

      for (const filePath of scriptFiles) {
        if (!EVAL_LIKE_PATTERN.test(fs.readFileSync(filePath, "utf8"))) continue;
        offenders.push(`${runtimePackage.name}:${path.relative(scriptRoot, filePath)}`);
      }
    }

    expect(offenders).toEqual([]);
  });
});
