import type { NextConfig } from "next";

/**
 * Where the REST API lives. The browser never sees this value: it calls the
 * relative `/api/...` and the rewrite below forwards it.
 */
const apiBaseUrl = process.env.API_INTERNAL_URL ?? "http://localhost:4000";

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

  /**
   * Proxy the API onto this origin.
   *
   * This is what lets the admin session be an ordinary same-origin httpOnly
   * cookie with SameSite=Lax, instead of a cross-site cookie needing
   * SameSite=None plus CORS with credentials. The API itself stays pure bearer
   * auth, so it remains callable with curl.
   *
   * Returning an array puts these in the `afterFiles` phase, which runs *after*
   * filesystem routes are checked. That ordering matters: the login route that
   * sets the cookie is a real route handler at app/api/..., and it has to win
   * over this catch-all rather than be forwarded to the API.
   *
   * The Stripe webhook must NOT come through here. Stripe is pointed straight at
   * the API's own URL, because a proxy hop can alter the raw bytes the signature
   * was computed over.
   */
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiBaseUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
