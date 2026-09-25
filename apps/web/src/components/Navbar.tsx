"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import CartLink from "@/components/CartLink";
import { restaurantInfo } from "@/data/restaurant";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/menu", label: "Menu" },
  { href: "/gallery", label: "Gallery" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

/** Routes that do not open on a dark hero, so the bar cannot be transparent. */
const opaqueRoutes = ["/menu/scan"];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);

  const needsSolidGround = opaqueRoutes.includes(pathname);
  const solid = needsSolidGround || scrolled || mobileOpen;

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        setScrolled(window.scrollY > 50);
        frame = 0;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  // A route change closes the panel, so it never survives a navigation.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  const isCurrent = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header
      className={`on-charcoal fixed top-0 left-0 right-0 z-50 no-print transition-colors duration-500 ${
        solid ? "bg-charcoal/95 backdrop-blur-md" : "bg-transparent"
      }`}
    >
      <nav aria-label="Main" className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between py-4">
          <Link
            href="/"
            className="font-display text-2xl font-semibold tracking-wide text-gold"
          >
            {restaurantInfo.name}
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => {
              const current = isCurrent(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={current ? "page" : undefined}
                  className={`relative py-1 text-sm uppercase tracking-widest transition-colors duration-300 hover:text-gold ${
                    current ? "text-gold" : "text-cream"
                  }`}
                >
                  {link.label}
                  {current && (
                    <span
                      aria-hidden="true"
                      className="absolute -bottom-0.5 left-0 right-0 h-px bg-gold"
                    />
                  )}
                </Link>
              );
            })}
            <CartLink className="-mr-2" />
            <Link
              href="/contact"
              className="px-5 py-2.5 bg-gold text-charcoal text-sm font-semibold rounded-sm transition-colors duration-300 hover:bg-gold-light"
            >
              Reserve a table
            </Link>
          </div>

          <div className="flex items-center md:hidden">
            <CartLink />
            <button
              type="button"
              onClick={() => setMobileOpen((open) => !open)}
              className="-mr-2 flex h-11 w-11 items-center justify-center"
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              <span aria-hidden="true" className="relative block h-4 w-6">
                <span
                  className={`absolute left-0 block h-px w-6 bg-cream transition-transform duration-300 ${
                    mobileOpen ? "top-1/2 rotate-45" : "top-0"
                  }`}
                />
                <span
                  className={`absolute left-0 top-1/2 block h-px w-6 -translate-y-1/2 bg-cream transition-opacity duration-300 ${
                    mobileOpen ? "opacity-0" : "opacity-100"
                  }`}
                />
                <span
                  className={`absolute left-0 block h-px w-6 bg-cream transition-transform duration-300 ${
                    mobileOpen ? "top-1/2 -rotate-45" : "bottom-0"
                  }`}
                />
              </span>
            </button>
          </div>
        </div>

        {/* Height animates through the row track, so no measurement is needed. */}
        <div
          id="mobile-nav"
          ref={panelRef}
          className="md:hidden grid transition-[grid-template-rows] duration-300 ease-out"
          style={{ gridTemplateRows: mobileOpen ? "1fr" : "0fr" }}
        >
          <div className="overflow-hidden">
            <ul className="flex flex-col gap-1 pb-5 pt-2">
              {navLinks.map((link) => {
                const current = isCurrent(link.href);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={current ? "page" : undefined}
                      tabIndex={mobileOpen ? undefined : -1}
                      className={`flex min-h-11 items-center text-sm uppercase tracking-widest transition-colors duration-300 hover:text-gold ${
                        current ? "text-gold" : "text-cream"
                      }`}
                    >
                      {link.label}
                    </Link>
                  </li>
                );
              })}
              <li className="mt-2">
                <Link
                  href="/contact"
                  tabIndex={mobileOpen ? undefined : -1}
                  className="flex min-h-11 items-center justify-center rounded-sm bg-gold px-6 text-sm font-semibold text-charcoal transition-colors duration-300 hover:bg-gold-light"
                >
                  Reserve a table
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </nav>
    </header>
  );
}
