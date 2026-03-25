import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import * as path from "path";

const runningFromSrcPackage = process.cwd().endsWith(`${path.sep}src`);
const testRoot = runningFromSrcPackage ? "." : "src";

export default defineConfig({
  test: {
    include: [`${testRoot}/**/__tests__/**/*.test.ts`],
    setupFiles: [`${testRoot}/scm/__tests__/setup.ts`],
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
