import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep project instructions concise instead of appending generated blocks.
  agentRules: false,
  experimental: {
    agentFeedback: false,
  },
  output: "export",
  trailingSlash: true,
  allowedDevOrigins: ["127.0.0.1"],
  images: { unoptimized: true },

  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
