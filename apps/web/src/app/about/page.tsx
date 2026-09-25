import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import PageHero from "@/components/PageHero";
import SectionHeader from "@/components/SectionHeader";
import AboutHistory from "@/components/AboutHistory";
import { restaurantInfo } from "@/data/restaurant";

export const metadata: Metadata = {
  title: "About us",
  description: `How ${restaurantInfo.name} came to be, who cooks here, and what we hold ourselves to.`,
  alternates: { canonical: "/about" },
};

const values = [
  {
    title: "Craftsmanship",
    description:
      "Every plate is prepared to order and finished by hand. Nothing leaves the pass that the kitchen would not eat itself.",
  },
  {
    title: "Sustainability",
    description:
      "We buy locally and in season. It keeps the money close to home and the produce closer to the day it was picked.",
  },
  {
    title: "Warmth",
    description:
      "Guests are greeted, not processed. The room is small, and we like it that way — it is how regulars happen.",
  },
];

const storyImages = [
  {
    src: "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=800&h=600&fit=crop",
    alt: "Produce from the morning market, still in the crate",
    className: "aspect-[4/3]",
  },
  {
    src: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&h=600&fit=crop",
    alt: "A cook plating at the pass",
    className: "aspect-[4/3] mt-8",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        title="About us"
        subtitle="The story behind every plate"
        image="https://images.unsplash.com/photo-1600891964092-4316c288032e?w=2000&h=1000&fit=crop"
      />

      <section className="bg-cream-dark py-28">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 px-6 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-4xl font-semibold leading-tight text-ink md:text-5xl">
              From dream to table
            </h2>
            <p className="mt-6 max-w-prose leading-relaxed text-ink-soft">
              {restaurantInfo.name} was born from a simple idea — a place where
              extraordinary food meets genuine warmth. Since{" "}
              {restaurantInfo.foundedYear} it has grown from a neighborhood gem
              into a destination for people who care what is on the plate.
            </p>
            <p className="mt-4 max-w-prose leading-relaxed text-ink-soft">
              The kitchen draws on culinary traditions from well beyond France,
              while keeping the techniques that make bistro cooking worth
              returning to.
            </p>
            <p className="mt-4 max-w-prose leading-relaxed text-ink-soft">
              Every morning we walk the local markets for the best of what is in
              season. Every evening we turn it into something worth sitting down
              for.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {storyImages.map((image) => (
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
            title="Our roots"
            subtitle="The story of this place, and the people who make it"
          />
          <AboutHistory />
        </div>
      </section>

      {/*
        The three values read as a list, not as three identical tiles: the name
        carries the display face and the hairline does the separating.
      */}
      <section className="bg-cream-dark py-28">
        <div className="mx-auto max-w-4xl px-6">
          <SectionHeader title="What we hold to" />
          <dl>
            {values.map((value) => (
              <div
                key={value.title}
                className="grid grid-cols-1 gap-x-10 gap-y-2 border-t border-ink/15 py-8 sm:grid-cols-[14rem_1fr]"
              >
                <dt className="font-display text-2xl font-semibold text-ink">
                  {value.title}
                </dt>
                <dd className="max-w-prose leading-relaxed text-ink-soft">
                  {value.description}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="on-charcoal bg-charcoal py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-display text-4xl font-semibold leading-tight text-cream md:text-5xl">
            Come and see for yourself
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-lg text-on-dark-soft">
            The room holds a few dozen people. Book ahead and we will keep one
            for you.
          </p>
          <Link
            href="/contact"
            className="mt-10 inline-flex min-h-12 items-center bg-gold px-10 text-sm font-semibold text-charcoal transition-colors duration-300 hover:bg-gold-light"
          >
            Reserve a table
          </Link>
        </div>
      </section>
    </>
  );
}
