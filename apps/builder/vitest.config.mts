import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  oxc: { jsx: { runtime: "automatic" } },
  resolve: {
    alias: {
      "@runtime": fileURLToPath(new URL("../runtime/src", import.meta.url)),
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: { include: ["src/**/*.test.{ts,tsx}"], testTimeout: 30000 },
});
