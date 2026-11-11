import { defineConfig } from "vitest/config";

export default defineConfig({
  // The Next.js tsconfig keeps JSX as-is ("preserve"); tests need it compiled.
  oxc: { jsx: { runtime: "automatic" } },
  test: { include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.ts"] },
});
