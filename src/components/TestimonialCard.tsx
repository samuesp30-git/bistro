import Image from "next/image";
import type { Testimonial } from "@/data/restaurant";

interface TestimonialCardProps {
  testimonial: Testimonial;
}

/**
 * No card chrome: a hairline above each column separates the three without
 * drawing a box the page does not need.
 */
export default function TestimonialCard({ testimonial }: TestimonialCardProps) {
  return (
    <figure className="flex h-full flex-col border-t border-ink/15 pt-7">
      <blockquote className="flex-1 font-display text-lg italic leading-relaxed text-ink-soft">
        <p>&ldquo;{testimonial.quote}&rdquo;</p>
      </blockquote>

      <figcaption className="mt-7 flex items-center gap-4">
        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full">
          <Image
            src={testimonial.avatar}
            alt=""
            fill
            sizes="44px"
            className="object-cover"
          />
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">{testimonial.name}</p>
          <p className="text-xs text-ink-muted">{testimonial.role}</p>
        </div>
      </figcaption>
    </figure>
  );
}
