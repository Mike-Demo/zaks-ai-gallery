import type { NextConfig } from "next";

/**
 * Static export: the gallery ships as plain HTML/CSS/JS so it can be served
 * from SpaceFast's static `public/` hosting. All AI work happens either in
 * SpaceFast serverless functions (functions/api/*, deterministic answers only)
 * or on the demo laptop (scripts/local-server.ts, full local RAG).
 */
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: false,
};

export default nextConfig;
