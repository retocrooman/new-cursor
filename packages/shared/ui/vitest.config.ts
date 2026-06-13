import sharedConfig from "@new-cursor/vitest-config/no-setup";
import { defineConfig, mergeConfig } from "vitest/config";

export default mergeConfig(
  sharedConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      setupFiles: ["./test/setup.ts"],
      include: ["src/**/__tests__/**/*.test.{ts,tsx}"],
    },
  }),
);
