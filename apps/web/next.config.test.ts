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
