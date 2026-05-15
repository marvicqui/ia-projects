import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["packages/modules/*/src/**/*.ts"],
      reporter: ["text", "html"],
      thresholds: {
        branches: 60,
        functions: 60,
        lines: 60,
        statements: 60
      }
    },
    include: [
      "packages/modules/*/src/**/*.test.ts",
      "tests/unit/**/*.test.ts"
    ],
    environment: "node"
  }
});
