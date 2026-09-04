import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["lucide-react"],
  outputFileTracingRoot: path.join(__dirname),
  webpack: (config) => {
    // Fix simli-client@3.0.2 broken dist/index.js:
    // It does require("./Client") (capital C) but the actual file is client.js (lowercase).
    // On Linux/Vercel (case-sensitive) this causes "Can't resolve './Client'".
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { NormalModuleReplacementPlugin } = require("webpack");
    config.plugins?.push(
      new NormalModuleReplacementPlugin(
        /^\.\/Client$/,
        (resource: { context?: string; request: string }) => {
          if (
            resource.context &&
            resource.context.includes("simli-client") &&
            resource.context.includes("dist")
          ) {
            resource.request = "./client";
          }
        }
      )
    );
    return config;
  },
};

export default nextConfig;
