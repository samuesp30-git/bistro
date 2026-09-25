import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Serve the modern formats first; both are far smaller than the JPEGs
    // Unsplash hands back.
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  poweredByHeader: false,
};

export default nextConfig;
