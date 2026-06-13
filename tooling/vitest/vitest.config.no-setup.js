import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    fileParallelism: true,
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: false,
        minThreads: 1,
        maxThreads: 4,
      },
    },
    hookTimeout: 30_000,
    env: {
      NODE_ENV: "test",
    },
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["node_modules/**", "dist/**"],
    },
  },
});
