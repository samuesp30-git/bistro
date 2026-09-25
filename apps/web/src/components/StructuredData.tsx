import { formatMoneyRange } from "@bistro/shared";
import { menuItems, ogImage, restaurantInfo, siteUrl } from "@/data/restaurant";

/**
 * Restaurant markup for search results and map listings: address, phone,
 * opening hours and price range, all read from the same data the pages render,
 * so the listing cannot contradict the site.
 */
export default function StructuredData() {
  const prices = menuItems.map((item) => item.priceCents);

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
    priceRange: formatMoneyRange(Math.min(...prices), Math.max(...prices)),
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
