import { restaurantInfo, mapsHref, telHref } from "@/data/restaurant";

export default function Footer() {
  return (
    <footer className="on-charcoal bg-charcoal text-on-dark-soft no-print">
      <div className="mx-auto max-w-7xl px-6 pt-16 pb-24 md:pb-16">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
          <div>
            <p className="mb-4 font-display text-2xl font-semibold tracking-wide text-gold">
              {restaurantInfo.name}
            </p>
            <p className="max-w-sm text-sm leading-relaxed">
              {restaurantInfo.description}
            </p>
          </div>

          <div>
            <h2 className="mb-4 text-sm font-semibold text-gold">Hours</h2>
            <ul className="space-y-2 text-sm">
              <li>{restaurantInfo.hours.weekday}</li>
              <li>{restaurantInfo.hours.weekend}</li>
              <li>{restaurantInfo.hours.sunday}</li>
            </ul>
          </div>

          <div>
            <h2 className="mb-4 text-sm font-semibold text-gold">Find us</h2>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href={mapsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors duration-300 hover:text-gold"
                >
                  {restaurantInfo.address}
                </a>
              </li>
              <li>
                <a
                  href={telHref}
                  className="tnum transition-colors duration-300 hover:text-gold"
                >
                  {restaurantInfo.phone}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${restaurantInfo.email}`}
                  className="transition-colors duration-300 hover:text-gold"
                >
                  {restaurantInfo.email}
                </a>
              </li>
            </ul>

            <ul className="mt-5 flex gap-5 text-sm">
              <li>
                <a
                  href={restaurantInfo.social.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors duration-300 hover:text-gold"
                >
                  Instagram
                </a>
              </li>
              <li>
                <a
                  href={restaurantInfo.social.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors duration-300 hover:text-gold"
                >
                  Facebook
                </a>
              </li>
            </ul>
          </div>
        </div>

        <p className="mt-12 border-t border-cream/10 pt-8 text-center text-xs text-on-dark-muted">
          &copy; {new Date().getFullYear()} {restaurantInfo.name}. All rights
          reserved.
        </p>
      </div>
    </footer>
  );
}
