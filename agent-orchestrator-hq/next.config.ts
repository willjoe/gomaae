import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* 
   * When building for Tauri, we must export the app as static HTML/JS/CSS.
   * Node.js API routes will be ignored in export mode.
   * Standard 'next build' remains for the Docker / Cloud target.
   */
  output: process.env.TAURI_BUILD === 'true' ? 'export' : undefined,
  // Ensure images work correctly in static export mode
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
