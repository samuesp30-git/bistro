import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import CartView from "@/components/CartView";
import OrderForm from "@/components/OrderForm";
import MenuUnavailable from "@/components/MenuUnavailable";
import { fetchMenu } from "@/lib/api";

export const metadata: Metadata = {
  title: "Your order",
  description: "Review your order, adjust quantities, and choose pickup or delivery.",
  alternates: { canonical: "/order" },
  // A cart is per-visitor and has nothing to offer a search result.
  robots: { index: false, follow: true },
};

/**
 * The menu is fetched here, on the server, and handed to the cart view. The cart
 * itself lives in the browser and holds identifiers only, so this is where the
 * two meet and the prices come from.
 */
export default async function OrderPage() {
  const menu = await fetchMenu();

  return (
    <>
      <PageHero
        title="Your order"
        subtitle="Check it over before you send it to the kitchen"
        image="https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=2000&h=1000&fit=crop"
      />

      <section className="bg-cream py-24">
        <div className="mx-auto max-w-6xl px-6">
          {menu ? (
            <>
              <CartView dishes={menu.dishes} />
              {/* The form hides itself on an empty cart, so it does not offer to
                  send nothing to the kitchen. */}
              <OrderForm dishes={menu.dishes} />
            </>
          ) : (
            <MenuUnavailable />
          )}
        </div>
      </section>
    </>
  );
}
