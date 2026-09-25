import Image from "next/image";
import type { ReactNode } from "react";

interface PageHeroProps {
  title: string;
  /** One line under the title. Kept short: this band is wayfinding, not copy. */
  subtitle?: string;
  image: string;
  children?: ReactNode;
}

/**
 * The band that opens every page except the home page. It sits lower and
 * anchors to the bottom-left of the frame, so an inner page never reads as a
 * second attempt at the home page's centred opening.
 */
export default function PageHero({
  title,
  subtitle,
  image,
  children,
}: PageHeroProps) {
  return (
    <section className="relative flex h-[46svh] min-h-[340px] items-end overflow-hidden bg-charcoal">
      <Image
        src={image}
        alt=""
        fill
        sizes="100vw"
        priority
        className="object-cover"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-charcoal/90 via-charcoal/60 to-charcoal/40"
      />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-12">
        <h1 className="font-display text-[clamp(2.5rem,7vw,4.5rem)] font-semibold leading-[1.02] tracking-wide text-cream">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-3 max-w-xl text-lg text-on-dark-soft">{subtitle}</p>
        )}
        {children && <div className="mt-7">{children}</div>}
      </div>
    </section>
  );
}
