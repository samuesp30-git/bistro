import Image from "next/image";
import { restaurantHistory } from "@/data/restaurant";

export default function AboutHistory() {
  return (
    <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
      <div className="relative h-[clamp(20rem,45vw,31rem)] overflow-hidden">
        <Image
          src={restaurantHistory.photo}
          alt="The dining room, looking toward the bar"
          fill
          sizes="(min-width: 1024px) 46vw, 92vw"
          className="object-cover"
        />
      </div>

      <div>
        <h3 className="font-display text-3xl font-semibold leading-tight text-ink">
          {restaurantHistory.tagline}
        </h3>
        <p className="mt-5 max-w-prose leading-relaxed text-ink-soft">
          {restaurantHistory.story}
        </p>
        <p className="mt-4 max-w-prose leading-relaxed text-ink-soft">
          {restaurantHistory.local}
        </p>

        <dl className="mt-10 grid grid-cols-3 gap-6 border-t border-ink/15 pt-7">
          {restaurantHistory.stats.map((stat) => (
            <div key={stat.label}>
              <dd className="tnum font-display text-4xl font-semibold text-gold-ink">
                {stat.value}
              </dd>
              <dt className="mt-1 text-sm text-ink-muted">{stat.label}</dt>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
