import Image from "next/image";
import type { MenuItem } from "@/data/restaurant";

interface MenuCardProps {
  item: MenuItem;
}

export default function MenuCard({ item }: MenuCardProps) {
  return (
    <article className="group flex h-full flex-col bg-cream shadow-md shadow-charcoal/5 transition-shadow duration-500 hover:shadow-xl hover:shadow-charcoal/10">
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={item.image}
          alt={item.name}
          fill
          sizes="(min-width: 1024px) 30vw, (min-width: 768px) 45vw, 92vw"
          className="object-cover"
        />
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="font-display text-xl font-semibold leading-tight text-ink">
            {item.name}
          </h3>
          <span className="tnum shrink-0 text-lg font-semibold text-gold-ink">
            {item.price}
          </span>
        </div>

        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          {item.description}
        </p>

        {item.tags && item.tags.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2">
            {item.tags.map((tag) => (
              <li
                key={tag}
                className="bg-cream-dark px-2 py-1 text-xs tracking-wide text-ink-muted"
              >
                {tag}
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
