import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/PageHero";
import MenuList from "@/components/MenuList";
import MenuUnavailable from "@/components/MenuUnavailable";
import { WhatsAppIcon } from "@/components/icons";
import { fetchMenu } from "@/lib/api";
import { whatsappLink, whatsappMessages } from "@/data/restaurant";

export const metadata: Metadata = {
  title: "Menu",
  description:
    "Entrées, plats, desserts and drinks, with prices. Printable version available for the table.",
  alternates: { canonical: "/menu" },
};

/*
  No `export const revalidate` here on purpose.

  The interval is set once, on the fetch inside lib/api.ts, and Next lowers the
  whole route's revalidation to match the shortest fetch in it. A segment config
  export would have to be a literal — the docs are explicit that the value must
  be statically analyzable, so `revalidate = MENU_REVALIDATE_SECONDS` silently
  does nothing — and hardcoding 60 in four page files is four places to drift.
*/

export default async function MenuPage() {
  const menu = await fetchMenu();

  return (
    <>
      <PageHero
        title="The menu"
        subtitle="Four courses, changed with the season"
        image="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=2000&h=1000&fit=crop"
      >
        <Link
          href="/menu/scan"
          className="inline-flex min-h-11 items-center border border-cream/40 px-6 text-sm font-semibold text-cream transition-colors duration-300 hover:border-gold hover:text-gold"
        >
          Printable version
        </Link>
      </PageHero>

      <section className="bg-cream py-24">
        <div className="mx-auto max-w-7xl px-6">
          {menu ? (
            <MenuList
              categories={menu.categories}
              dietaryTags={menu.dietaryTags}
              dishes={menu.dishes}
            />
          ) : (
            <MenuUnavailable />
          )}
        </div>
      </section>

      <section className="on-charcoal bg-charcoal py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-display text-4xl font-semibold leading-tight text-cream md:text-5xl">
            Ready to order?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-lg text-on-dark-soft">
            Book a table, or message us to arrange takeout.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/contact"
              className="inline-flex min-h-12 items-center justify-center bg-gold px-10 text-sm font-semibold text-charcoal transition-colors duration-300 hover:bg-gold-light"
            >
              Reserve a table
            </Link>
            <a
              href={whatsappLink(whatsappMessages.order)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center justify-center gap-3 bg-whatsapp px-10 text-sm font-semibold text-charcoal transition-colors duration-300 hover:bg-whatsapp-dark"
            >
              <WhatsAppIcon className="h-5 w-5" />
              Order on WhatsApp
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
