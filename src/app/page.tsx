import Image from "next/image";
import Link from "next/link";
import HeroSection from "@/components/HeroSection";
import SectionHeader from "@/components/SectionHeader";
import Reveal from "@/components/Reveal";
import MenuCard from "@/components/MenuCard";
import TestimonialCard from "@/components/TestimonialCard";
import { WhatsAppIcon } from "@/components/icons";
import {
  featuredItems,
  restaurantInfo,
  testimonials,
  whatsappLink,
  whatsappMessages,
} from "@/data/restaurant";

const previewImages = [
  {
    src: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop",
    alt: "A plate being finished at the pass",
    className: "aspect-[4/3]",
  },
  {
    src: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop",
    alt: "The dining room under low pendant light",
    className: "aspect-[4/3] mt-8",
  },
  {
    src: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1400&h=560&fit=crop",
    alt: "A table for two laid with candles and linen",
    className: "aspect-[5/2] col-span-2",
  },
];

export default function HomePage() {
  return (
    <>
      <HeroSection />

      <section className="bg-cream-dark py-28">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 px-6 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-4xl font-semibold leading-tight text-ink md:text-5xl">
              A passion for perfection
            </h2>
            <p className="mt-6 max-w-prose leading-relaxed text-ink-soft">
              {restaurantInfo.description}
            </p>
            <p className="mt-4 max-w-prose leading-relaxed text-ink-soft">
              From hand-selected ingredients to plates crafted with devotion,
              every detail at {restaurantInfo.name} is designed to delight. We
              believe dining is not just a meal — it is an experience to be
              savored.
            </p>
            <Link
              href="/about"
              className="mt-9 inline-flex min-h-12 items-center bg-gold px-8 text-sm font-semibold text-charcoal transition-colors duration-300 hover:bg-gold-light"
            >
              Read our story
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {previewImages.map((image) => (
              <div
                key={image.src}
                className={`relative overflow-hidden ${image.className}`}
              >
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  sizes="(min-width: 1024px) 23vw, 46vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-cream py-28">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHeader
            title="Signature dishes"
            subtitle="Three plates the kitchen is known for"
          />
          <ul className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {featuredItems.map((item, index) => (
              <li key={item.id} className="flex">
                <Reveal delay={index * 0.1} className="flex w-full">
                  <MenuCard item={item} />
                </Reveal>
              </li>
            ))}
          </ul>
          <div className="mt-14 text-center">
            <Link
              href="/menu"
              className="inline-flex min-h-12 items-center border border-ink/20 px-8 text-sm font-semibold text-ink transition-colors duration-300 hover:border-gold-ink hover:text-gold-ink"
            >
              See the full menu
            </Link>
          </div>
        </div>
      </section>

      <section className="on-charcoal relative overflow-hidden bg-charcoal py-36">
        <Image
          src="https://images.unsplash.com/photo-1552566626-52f8b828add9?w=2000&h=900&fit=crop"
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-charcoal/75" />
        <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-display text-4xl font-semibold leading-tight text-cream md:text-6xl">
            An evening to remember
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-on-dark-soft">
            An intimate dinner for two, a celebration with friends, or a private
            event — the room is set for whichever evening you are planning.
          </p>
          <Link
            href="/contact"
            className="mt-10 inline-flex min-h-12 items-center bg-gold px-10 text-sm font-semibold text-charcoal transition-colors duration-300 hover:bg-gold-light"
          >
            Reserve a table
          </Link>
        </div>
      </section>

      <section className="bg-cream-dark py-28">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHeader
            title="What guests say"
            subtitle="From the people who keep coming back"
          />
          <ul className="grid grid-cols-1 gap-10 md:grid-cols-3">
            {testimonials.map((testimonial) => (
              <li key={testimonial.id} className="flex">
                <TestimonialCard testimonial={testimonial} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="on-charcoal bg-charcoal py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-display text-4xl font-semibold leading-tight text-cream md:text-5xl">
            Your table is waiting
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-lg text-on-dark-soft">
            Book online, or send us a message and we will take it from there.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/contact"
              className="inline-flex min-h-12 items-center justify-center bg-gold px-10 text-sm font-semibold text-charcoal transition-colors duration-300 hover:bg-gold-light"
            >
              Reserve a table
            </Link>
            <a
              href={whatsappLink(whatsappMessages.reservation)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center justify-center gap-3 bg-whatsapp px-10 text-sm font-semibold text-charcoal transition-colors duration-300 hover:bg-whatsapp-dark"
            >
              <WhatsAppIcon className="h-5 w-5" />
              Message us
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
