import type { Menu } from "@bistro/shared";

/**
 * Base URL the *server* uses to reach the API.
 *
 * Deliberately not prefixed with NEXT_PUBLIC_, so it is never inlined into the
 * browser bundle. The browser does not use this value at all: it calls the
 * relative path `/api/...`, which next.config.ts rewrites to the same API. That
 * split is the whole point of the arrangement — the browser stays same-origin,
 * so a session cookie needs no SameSite=None and no CORS credentials, while the
 * server talks to the API directly and skips its own proxy.
 *
 * A server-side fetch cannot use a relative URL, which is why this has to exist.
 */
const API_BASE_URL = process.env.API_INTERNAL_URL ?? "http://localhost:4000";

/**
 * How long a rendered page may serve a cached menu.
 *
 * Without this the default is `auto no cache`, which for a prerenderable route
 * means Next fetches once during `next build` and then never again — so a price
 * the owner edits in the panel would never reach the site until the next deploy.
 * Verified in node_modules/next/dist/docs/.../functions/fetch.md.
 *
 * Sixty seconds is the trade: a price change is visible within a minute, and the
 * API is not asked once per visitor.
 */
export const MENU_REVALIDATE_SECONDS = 60;

/**
 * Interval for callers that only need the coarse price band in the structured
 * data, not live prices.
 *
 * That component renders in the root layout, so it is on every page. At 60s it
 * dragged /about, /contact and /gallery down to a one-minute cache lifetime as
 * well, which is the menu dictating the cache policy of pages that have nothing
 * to do with the menu. A price *band* moves a few times a year.
 *
 * On the menu page both fetches run against the same URL, and Next uses the
 * lower of the two intervals, so the menu itself is still a minute fresh.
 */
export const PRICE_BAND_REVALIDATE_SECONDS = 60 * 60;

/**
 * Reads the menu, or returns null if the API cannot answer.
 *
 * Null rather than a throw on purpose. The API runs on a free tier that sleeps,
 * so an unreachable API is an expected state, not an exception: a throw here
 * would fail `next build` whenever the API happened to be cold, which would turn
 * a sleeping backend into a broken deploy. Callers render an explicit
 * "unavailable" state instead, and the next revalidation picks the menu up.
 */
export async function fetchMenu(
  { revalidate = MENU_REVALIDATE_SECONDS }: { revalidate?: number } = {}
): Promise<Menu | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/menu`, {
      next: { revalidate },
    });

    if (!response.ok) {
      console.error(`[web] GET /api/menu responded ${response.status}`);
      return null;
    }

    return (await response.json()) as Menu;
  } catch (error) {
    console.error("[web] GET /api/menu failed:", error);
    return null;
  }
}
