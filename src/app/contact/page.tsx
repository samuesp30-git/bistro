import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import ContactForm from "@/components/ContactForm";
import {
  mapsHref,
  restaurantInfo,
  telHref,
  whatsappLink,
  whatsappMessages,
} from "@/data/restaurant";
import {
  ClockIcon,
  PhoneIcon,
  PinIcon,
  WhatsAppIcon,
} from "@/components/icons";

export const metadata: Metadata = {
  title: "Contact & reservations",
  description: `Where to find ${restaurantInfo.name}, when we are open, and how to book a table.`,
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <PageHero
        title="Contact us"
        subtitle="Where to find us, and how to book"
        image="https://images.unsplash.com/photo-1552566626-52f8b828add9?w=2000&h=1000&fit=crop"
      />

      {/* One band, three columns, hairlines instead of three floating tiles. */}
      <section className="bg-cream-dark">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-y-10 px-6 py-14 sm:grid-cols-3 sm:gap-x-10 sm:divide-x sm:divide-ink/15">
          <div className="sm:pr-10">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <PinIcon className="h-5 w-5 text-gold-ink" />
              Address
            </h2>
            <a
              href={mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-sm text-ink-soft underline decoration-ink/25 transition-colors duration-300 hover:text-gold-ink hover:decoration-gold-ink"
            >
              {restaurantInfo.address}
            </a>
          </div>

          <div className="sm:px-10">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <ClockIcon className="h-5 w-5 text-gold-ink" />
              Hours
            </h2>
            <ul className="mt-3 space-y-1 text-sm text-ink-soft">
              <li>{restaurantInfo.hours.weekday}</li>
              <li>{restaurantInfo.hours.weekend}</li>
              <li>{restaurantInfo.hours.sunday}</li>
            </ul>
          </div>

          <div className="sm:pl-10">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <PhoneIcon className="h-5 w-5 text-gold-ink" />
              Reach us
            </h2>
            <ul className="mt-3 space-y-1 text-sm text-ink-soft">
              <li>
                <a
                  href={telHref}
                  className="tnum underline decoration-ink/25 transition-colors duration-300 hover:text-gold-ink hover:decoration-gold-ink"
                >
                  {restaurantInfo.phone}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${restaurantInfo.email}`}
                  className="underline decoration-ink/25 transition-colors duration-300 hover:text-gold-ink hover:decoration-gold-ink"
                >
                  {restaurantInfo.email}
                </a>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-cream py-24">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-16 px-6 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-semibold text-ink">
              Request a table
            </h2>
            <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-soft">
              Fill this in and we will open WhatsApp with your details written
              out, ready to send.
            </p>
            <div className="mt-8">
              <ContactForm />
            </div>
          </div>

          <div>
            <h2 className="font-display text-3xl font-semibold text-ink">
              Find us
            </h2>
            <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-soft">
              We are on {restaurantInfo.addressParts.street}, a short walk from
              the {restaurantInfo.addressParts.locality} subway.
            </p>

            <a
              href={mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 flex min-h-56 flex-col items-center justify-center gap-3 border border-ink/15 bg-cream-dark px-6 py-10 text-center transition-colors duration-300 hover:border-gold-ink"
            >
              <PinIcon className="h-9 w-9 text-gold-ink" />
              <span className="text-sm font-semibold text-ink">
                {restaurantInfo.address}
              </span>
              <span className="text-sm text-gold-ink underline">
                Open in Google Maps
              </span>
            </a>

            <div className="mt-8 border-t border-ink/15 pt-8">
              <h3 className="font-display text-2xl font-semibold text-ink">
                Prefer to message?
              </h3>
              <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-soft">
                Reservations, questions and special requests all reach the same
                phone behind the bar.
              </p>
              <a
                href={whatsappLink(whatsappMessages.question)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex min-h-12 items-center gap-3 rounded-sm bg-whatsapp px-8 text-sm font-semibold text-charcoal transition-colors duration-300 hover:bg-whatsapp-dark"
              >
                <WhatsAppIcon className="h-5 w-5" />
                Message us on WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
