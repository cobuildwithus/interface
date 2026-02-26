import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.test.{ts,tsx}"],
    coverage: {
      enabled: true,
      provider: "v8",
      reporter: ["text", "lcov"],
      reportsDirectory: "./coverage",
      include: [
        "lib/**/*.{ts,tsx}",
        "app/(app)/rounds/[id]/round-submissions-media.tsx",
        "app/(app)/rounds/[id]/round-variant-config.tsx",
      ],
      exclude: ["**/generated/**", "**/*.d.ts", "**/*.test.{ts,tsx}", "**/*types.ts"],
      thresholds: {
        perFile: true,
        lines: 85,
        functions: 85,
        branches: 80,
        statements: 85,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
