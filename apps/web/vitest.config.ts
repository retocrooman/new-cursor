import { resolve } from "node:path";
import sharedConfig from "@new-cursor/vitest-config/no-setup";
import { defineConfig, mergeConfig } from "vitest/config";

export default mergeConfig(
  sharedConfig,
  defineConfig({
    resolve: {
      alias: {
        "@": resolve(__dirname, "."),
      },
    },
    test: {
      include: ["__tests__/**/*.test.ts", "__tests__/**/*.test.tsx"],
    },
  }),
);
