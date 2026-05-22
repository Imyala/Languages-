import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

// Wrap the config so the service worker (src/app/sw.ts) is built into the
// final `out/` static export, giving us full offline support (app shell +
// runtime caching of model assets).
const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  cacheOnNavigation: true,
  reloadOnOnline: true,
  // Don't precache big chunks (WebLLM is ~5.7 MB) — they would saturate the
  // user's connection on first visit. They load on demand and get cached via
  // runtimeCaching the first time the user actually visits /setup or /write.
  // Default Serwist limit (2 MB) is appropriate here.
  // Only register the SW in production builds.
  disable: process.env.NODE_ENV !== "production",
});

// Set by the GitHub Pages workflow to `/Languages-` (the repo subpath). Empty
// when serving from the domain root (custom domain, Cloudflare Pages, local).
const basePath = process.env.NEXT_BASE_PATH || "";

const nextConfig: NextConfig = {
  // Pure static export — no server runtime required. Deploy to GitHub Pages,
  // Cloudflare Pages, Netlify, S3, or just open the index.html from a USB.
  output: "export",
  // Generate folder/index.html so static hosts serve clean URLs.
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  basePath,
  assetPrefix: basePath || undefined,
};

export default withSerwist(nextConfig);
