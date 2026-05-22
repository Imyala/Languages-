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
  // The WebLLM runtime is ~6 MB; precache it so the app works fully offline.
  maximumFileSizeToCacheInBytes: 16 * 1024 * 1024,
  // Only register the SW in production builds.
  disable: process.env.NODE_ENV !== "production",
});

const nextConfig: NextConfig = {
  // Pure static export — no server runtime required. Deploy to GitHub Pages,
  // Cloudflare Pages, Netlify, S3, or just open the index.html from a USB.
  output: "export",
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default withSerwist(nextConfig);
