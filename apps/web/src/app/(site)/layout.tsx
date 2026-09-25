import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import StructuredData from "@/components/StructuredData";
import { CartProvider } from "@/lib/cart";

/**
 * Everything a guest sees.
 *
 * A route group, so none of this appears in the URL. It exists to keep the public
 * chrome off the staff panel: a fixed dark navbar over the panel's cream ground
 * would be unreadable, and an internal tool has no business showing a floating
 * WhatsApp bubble or a table-booking button.
 */
export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-gold focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-charcoal"
      >
        Skip to content
      </a>
      {/*
        The cart wraps the public site so the navbar can show a count on every
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
    </>
  );
}
