import type { Metadata } from "next";
import Image from "next/image";
import { formatMoney } from "@bistro/shared";
import {
  menuCategories,
  menuItems,
  restaurantInfo,
} from "@/data/restaurant";
import ScanPrintBar from "@/components/ScanPrintBar";

export const metadata: Metadata = {
  title: "Printable menu",
  description: `The ${restaurantInfo.name} menu as a single sheet, sized for printing.`,
  alternates: { canonical: "/menu/scan" },
  robots: { index: false, follow: true },
};

export default function ScanMenuPage() {
  return (
    <div className="bg-surface-print px-4 pb-16 pt-24 print:p-0">
      <div className="print-full-width mx-auto max-w-3xl overflow-hidden bg-white shadow-2xl shadow-charcoal/10">
        {/*
          print-keep holds the ink: browsers drop backgrounds by default, which
          would print cream lettering onto a white block.
        */}
        <header className="print-keep bg-charcoal px-6 py-10 text-center">
          <p className="font-display text-4xl font-semibold tracking-wide text-cream">
            {restaurantInfo.name}
          </p>
          <p className="mt-3 font-display text-sm italic text-on-dark-soft">
            {restaurantInfo.tagline}
          </p>
        </header>

        <ScanPrintBar />

        <div className="p-6 sm:p-8">
          {menuCategories.map((category) => {
            const items = menuItems.filter(
              (item) => item.category === category
            );
            if (items.length === 0) return null;

            return (
              <section key={category} className="mb-10 last:mb-0">
                <h2 className="font-display text-2xl font-semibold text-ink">
                  {category}
                </h2>
                <div aria-hidden="true" className="mt-2 mb-6 h-px bg-ink/15" />

                <ul className="space-y-5">
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className="print-avoid-break flex gap-4"
                    >
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden">
                        <Image
                          src={item.image}
                          alt=""
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <h3 className="text-sm font-semibold text-ink">
                            {item.name}
                          </h3>
                          <span className="tnum shrink-0 text-sm font-semibold text-gold-ink">
                            {formatMoney(item.priceCents)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                          {item.description}
                        </p>
                        {item.tags && item.tags.length > 0 && (
                          <p className="mt-1.5 text-xs text-ink-muted">
                            {item.tags.join(" · ")}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

        <footer className="print-keep bg-charcoal px-6 py-6 text-center">
          <p className="tnum text-xs text-on-dark-soft">
            {restaurantInfo.address} &middot; {restaurantInfo.phone}
          </p>
          <p className="mt-1 text-xs text-on-dark-muted">
            Prices may change. Please tell your server about any allergies.
          </p>
        </footer>
      </div>
    </div>
  );
}
