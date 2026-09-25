"use client";

import Link from "next/link";
import { BagIcon } from "@/components/icons";
import { useCart } from "@/lib/cart";

/**
 * The bag in the navbar.
 *
 * The count is part of the link's accessible name rather than a bare number
 * floating next to an icon, so a screen reader announces "Your order, 3 items"
 * instead of "3, link". The badge itself is hidden from assistive technology to
 * avoid reading the same number twice.
 */
export default function CartLink({ className = "" }: { className?: string }) {
  const { itemCount, hydrated } = useCart();

  // Nothing is drawn until the stored cart has been read, so the badge never
  // appears as a zero and then jumps to its real value.
  const showBadge = hydrated && itemCount > 0;

  const label = showBadge
    ? `Your order, ${itemCount} ${itemCount === 1 ? "item" : "items"}`
    : "Your order";

  return (
    <Link
      href="/order"
      aria-label={label}
      className={`relative flex h-11 w-11 items-center justify-center text-cream transition-colors duration-300 hover:text-gold ${className}`}
    >
      <BagIcon className="h-6 w-6" />
      {showBadge && (
        <span
          aria-hidden="true"
          className="tnum absolute right-0.5 top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1.5 text-xs font-semibold text-charcoal"
        >
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      )}
    </Link>
  );
}
