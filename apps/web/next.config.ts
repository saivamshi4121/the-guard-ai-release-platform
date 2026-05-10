import path from "node:path";

import type { NextConfig } from "next";

// With Root Directory = apps/web, Turbopack otherwise treats only apps/web as the project
// root and refuses to resolve workspace packages under packages/* (see Next turbopack.root).
const monorepoRoot = path.resolve(process.cwd(), "../..");

const nextConfig: NextConfig = {
  transpilePackages: ["@the-guard/db"],
  outputFileTracingRoot: monorepoRoot,
  turbopack: {
    root: monorepoRoot,
  },
};

export default nextConfig;
