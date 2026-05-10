import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@the-guard/db"],
  // Monorepo root when commands run from apps/web (local + Vercel Root Directory).
  outputFileTracingRoot: path.resolve(process.cwd(), "../.."),
};

export default nextConfig;
