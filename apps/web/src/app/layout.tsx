import type { Metadata, Viewport } from "next";
import { Inter, Cormorant_Garamond } from "next/font/google";
import Navbar from "@/components/Navbar";
import { CartProvider } from "@/lib/cart";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import StructuredData from "@/components/StructuredData";
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
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-gold focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-charcoal"
        >
          Skip to content
        </a>
        {/*
          The cart wraps the whole app so the navbar can show a count on every
          page. It holds identifiers only; prices are resolved against the menu
          wherever the cart is actually displayed.
        */}
        <CartProvider>
          <Navbar />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer />
        </CartProvider>
        <WhatsAppButton />
        <StructuredData />
      </body>
    </html>
  );
}
