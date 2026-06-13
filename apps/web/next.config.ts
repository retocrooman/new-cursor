import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  serverExternalPackages: ["@cursor/sdk"],
  transpilePackages: [
    "@new-cursor/db",
    "@new-cursor/errors",
    "@new-cursor/events",
    "@new-cursor/logger",
    "@new-cursor/orpc-contract",
    "@new-cursor/projections",
    "@new-cursor/ui",
    "@new-cursor/utils",
  ],
};

export default nextConfig;
