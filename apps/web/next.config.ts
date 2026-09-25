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
   * The public API, proxied onto this origin so the browser's calls are
   * same-origin: no CORS preflight, and the API's own URL is never shipped to
   * the client.
   *
   * This is an allowlist, not `/api/:path*`, and that is deliberate on two
   * counts.
   *
   * Security: a blanket proxy would expose `/api/admin/*` to anyone who typed the
   * URL. Those routes are meant to be reached only with a bearer token that the
   * browser deliberately never holds — the token lives in an httpOnly cookie and
   * is attached server-side. Leaving the whole prefix open would undo that.
   *
   * Routing: rewrites returned as an array run after static filesystem routes but
   * *before* dynamic ones (verified in the rewrites doc). A catch-all proxy would
   * therefore beat any `app/api/admin/[...]` handler and silently win. Keeping
   * admin out of the source removes the conflict instead of fighting it.
   *
   * The Stripe webhook must NOT come through here either. Stripe is pointed
   * straight at the API's own URL, because a proxy hop can alter the raw bytes the
   * signature was computed over.
   */
  async rewrites() {
    return [
      { source: "/api/menu", destination: `${apiBaseUrl}/api/menu` },
      { source: "/api/orders", destination: `${apiBaseUrl}/api/orders` },
      {
        source: "/api/orders/:token",
        destination: `${apiBaseUrl}/api/orders/:token`,
      },
    ];
  },
};

export default nextConfig;
