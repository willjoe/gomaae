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
  // Memory and Speed Optimization for 8GB RAM
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  serverExternalPackages: ['sqlite-vec', 'better-sqlite3'],
  // Ensure we don't bundle Storybook or native binary files into the app
  webpack: (config) => {
    config.module.rules.push({
      test: /\.stories\.(js|jsx|ts|tsx)$/,
      loader: 'ignore-loader',
    });
    // Ignore native binary files that Next.js tries to parse as JS
    config.module.rules.push({
      test: /\.(dylib|so|dll|node)$/,
      loader: 'ignore-loader',
    });
    return config;
  },
  // Disable Turbopack for production builds to respect the Webpack loaders above
  turbopack: undefined,
};

export default nextConfig;
