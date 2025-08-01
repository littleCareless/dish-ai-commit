import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  test: {
    include: ["src/**/__tests__/**/*.test.ts"],
    setupFiles: ["src/scm/__tests__/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
    },
    environment: "node",
    globals: true,
    testTimeout: 10000,
    hookTimeout: 5000,
    teardownTimeout: 5000,
  },
  plugins: [tsconfigPaths()],
});
