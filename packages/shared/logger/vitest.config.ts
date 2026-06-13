import sharedConfig from "@new-cursor/vitest-config/no-setup";
import { defineConfig, mergeConfig } from "vitest/config";

export default mergeConfig(
  sharedConfig,
  defineConfig({
    test: {
      include: ["__tests__/**/*.test.ts"],
    },
  }),
);
