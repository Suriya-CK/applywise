import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Tests never need real secrets - see tests/setup.ts
    setupFiles: ["./tests/setup.ts"],
  },
});
