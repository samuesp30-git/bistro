import { formatMoneyRange, menuPriceRange } from "@bistro/shared";
import { fetchMenu, PRICE_BAND_REVALIDATE_SECONDS } from "@/lib/api";
import {
  FALLBACK_PRICE_RANGE,
  ogImage,
  restaurantInfo,
  siteUrl,
} from "@/data/restaurant";

/**
 * Restaurant markup for search results and map listings: address, phone,
 * opening hours and price range, all read from the same data the pages render,
 * so the listing cannot contradict the site.
 *
 * This renders in the root layout, so it is on every page — which is exactly why
 * the menu fetch here must never throw. `fetchMenu` returns null instead, and the
 * price band falls back to a committed constant. A sleeping API must not take the
 * About page down with it.
 */
export default async function StructuredData() {
  const menu = await fetchMenu({ revalidate: PRICE_BAND_REVALIDATE_SECONDS });
  const range = menu ? menuPriceRange(menu.dishes) : null;
  const priceRange = range
    ? formatMoneyRange(range.minCents, range.maxCents)
    : FALLBACK_PRICE_RANGE;

  const { addressParts } = restaurantInfo;

  const schema = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: restaurantInfo.name,
    description: restaurantInfo.description,
    url: siteUrl,
    telephone: restaurantInfo.phone,
    email: restaurantInfo.email,
    image: ogImage,
    servesCuisine: "French",
    priceRange,
    foundingDate: String(restaurantInfo.foundedYear),
    acceptsReservations: `${siteUrl}/contact`,
    hasMenu: `${siteUrl}/menu`,
    sameAs: [restaurantInfo.social.instagram, restaurantInfo.social.facebook],
    address: {
      "@type": "PostalAddress",
      streetAddress: addressParts.street,
      addressLocality: addressParts.locality,
      addressRegion: addressParts.region,
      postalCode: addressParts.postalCode,
      addressCountry: addressParts.country,
    },
    openingHoursSpecification: restaurantInfo.openingHours.map((shift) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: shift.days,
      opens: shift.opens,
      closes: shift.closes,
    })),
  };

  return (
    <script
      type="application/ld+json"
      // Built from local data only; there is no user input in this object.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
