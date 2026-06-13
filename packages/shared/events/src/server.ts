/**
 * server-only entry point。`postgres` driver に依存する `appendEvent` をここから
 * だけ export する。client bundle には絶対に混入させないこと（top-level
 * `./index.ts` からは re-export しない）。
 */
export * from "./append";
