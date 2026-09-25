import Image from "next/image";
import Link from "next/link";
import { restaurantInfo } from "@/data/restaurant";

/**
 * The one authored moment on the site: the ground settles out of a slow zoom
 * while the name, the line and the two ways in arrive in sequence. Nothing
 * below this section animates on arrival.
 */
export default function HeroSection() {
  return (
    <section className="relative h-[100svh] min-h-[600px] overflow-hidden bg-charcoal">
      <div className="absolute inset-0 hero-ground">
        <Image
          src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=2000&h=1250&fit=crop"
          alt=""
          fill
          sizes="100vw"
          priority
          className="object-cover"
        />
      </div>

      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-charcoal/60 via-charcoal/50 to-charcoal/85"
      />

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="hero-settle flex flex-col items-center">
          <h1 className="font-display font-semibold tracking-wide text-cream text-[clamp(3.25rem,12vw,6rem)] leading-[0.95]">
            {restaurantInfo.name}
          </h1>

          <p className="mt-5 max-w-lg text-lg text-on-dark-soft md:text-xl">
            {restaurantInfo.tagline}
          </p>

          <div className="mt-11 flex flex-col gap-3 sm:flex-row sm:gap-4">
            <Link
              href="/menu"
              className="flex min-h-12 items-center justify-center bg-gold px-8 text-sm font-semibold text-charcoal transition-colors duration-300 hover:bg-gold-light"
            >
              View the menu
            </Link>
            <Link
              href="/contact"
              className="flex min-h-12 items-center justify-center border border-cream/40 px-8 text-sm font-semibold text-cream transition-colors duration-300 hover:border-gold hover:text-gold"
            >
              Reserve a table
            </Link>
          </div>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="absolute bottom-8 left-1/2 z-10 h-10 w-px -translate-x-1/2 bg-gradient-to-b from-cream/50 to-transparent"
      />
    </section>
  );
}
