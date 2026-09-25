import Image from "next/image";
import { formatMoney, type MenuDish } from "@bistro/shared";

interface MenuCardProps {
  dish: MenuDish;
}

export default function MenuCard({ dish }: MenuCardProps) {
  const soldOut = !dish.isAvailable;

  return (
    <article className="group flex h-full flex-col bg-cream shadow-md shadow-charcoal/5 transition-shadow duration-500 hover:shadow-xl hover:shadow-charcoal/10">
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={dish.imageUrl}
          alt={dish.name}
          fill
          sizes="(min-width: 1024px) 30vw, (min-width: 768px) 45vw, 92vw"
          /*
            Sold out is desaturated as well as labelled. Colour alone would be
            the only signal for anyone who cannot see it, which is why the badge
            below carries the actual words.
          */
          className={`object-cover ${soldOut ? "grayscale" : ""}`}
        />
        {soldOut && (
          <div className="absolute inset-x-0 bottom-0 bg-charcoal/90 px-4 py-2 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-cream">
              Sold out tonight
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="font-display text-xl font-semibold leading-tight text-ink">
            {dish.name}
          </h3>
          <span className="tnum shrink-0 text-lg font-semibold text-gold-ink">
            {formatMoney(dish.priceCents)}
          </span>
        </div>

        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          {dish.description}
        </p>

        {dish.tags.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2">
            {dish.tags.map((tag) => (
              <li
                key={tag.slug}
                className="bg-cream-dark px-2 py-1 text-xs tracking-wide text-ink-muted"
              >
                {tag.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
