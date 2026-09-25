import type { Metadata, Viewport } from "next";
import { Inter, Cormorant_Garamond } from "next/font/google";
import { ogImage, restaurantInfo, siteUrl } from "@/data/restaurant";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

/*
  Only the cuts the site sets: 600 for display headings, 400 for the italic
  pull-quote, each in both styles. Loading the full 400–700 range shipped eight
  files for two jobs.
*/
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${restaurantInfo.name} — French bistro dining`,
    template: `%s — ${restaurantInfo.name}`,
  },
  description: restaurantInfo.description,
  applicationName: restaurantInfo.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: restaurantInfo.name,
    title: `${restaurantInfo.name} — ${restaurantInfo.tagline}`,
    description: restaurantInfo.description,
    url: siteUrl,
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: `A plate being finished at ${restaurantInfo.name}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${restaurantInfo.name} — ${restaurantInfo.tagline}`,
    description: restaurantInfo.description,
    images: [ogImage],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#1a1a2e",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      // Tells the router the smooth scroll is deliberate, so it can opt out of
      // it during route transitions instead of animating every navigation.
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${cormorant.variable} h-full antialiased`}
    >
      {/*
        Only the document shell lives here: fonts, base metadata, and the stylesheet.
        The public navbar, footer, cart and structured data belong to the (site)
        group, because the staff panel is a different application that happens to
        share a domain — it should not carry a "Reserve a table" button or a
        floating WhatsApp bubble.
      */}
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
