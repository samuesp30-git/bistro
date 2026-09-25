"use client";

import Image from "next/image";
import Link from "next/link";
import { formatMoney, MAX_LINE_QUANTITY, type MenuDish } from "@bistro/shared";
import { MinusIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { useCart, useResolvedCart } from "@/lib/cart";

/**
 * The cart, priced against the menu that was just fetched rather than against
 * anything stored in the browser.
 *
 * That is the whole reason the stored cart holds only identifiers: a price the
 * owner edited a minute ago is the price shown here, and a dish that left the
 * menu is reported instead of quietly carried to the till.
 */
export default function CartView({ dishes }: { dishes: MenuDish[] }) {
  const { setQuantity, remove } = useCart();
  const {
    lines: resolved,
    subtotalCents,
    unavailable,
    soldOutLines,
    hydrated,
  } = useResolvedCart(dishes);

  // The server cannot know this browser's storage, so the first render is always
  // empty. Showing "your order is empty" during that moment would be wrong.
  if (!hydrated) {
    return (
      <p className="py-16 text-center text-sm text-ink-muted" aria-live="polite">
        Loading your order…
      </p>
    );
  }

  if (resolved.length === 0 && unavailable.length === 0) {
    return (
      <div className="border border-ink/10 px-6 py-20 text-center">
        <p className="font-display text-2xl font-semibold text-ink">
          Nothing in your order yet
        </p>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-ink-muted">
          Pick a few dishes and they will gather here.
        </p>
        <Link
          href="/menu"
          className="mt-8 inline-flex min-h-12 items-center bg-charcoal px-8 text-sm font-semibold text-cream transition-colors duration-300 hover:bg-ink"
        >
          Browse the menu
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_20rem]">
      <div>
        <ul className="divide-y divide-ink/10 border-y border-ink/10">
          {resolved.map((line) => (
            <li key={line.key} className="flex gap-4 py-6">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden">
                <Image
                  src={line.dish.imageUrl}
                  alt=""
                  fill
                  sizes="80px"
                  className={`object-cover ${
                    line.dish.isAvailable ? "" : "grayscale"
                  }`}
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="font-display text-lg font-semibold leading-tight text-ink">
                    {line.dish.name}
                  </h3>
                  <span className="tnum shrink-0 font-semibold text-ink">
                    {formatMoney(line.lineTotalCents)}
                  </span>
                </div>

                {line.options.length > 0 && (
                  <ul className="mt-1 text-sm text-ink-muted">
                    {line.options.map((entry) => (
                      <li key={entry.option.id}>
                        {entry.groupName}: {entry.option.name}
                        {entry.option.priceDeltaCents !== 0 && (
                          <span className="tnum">
                            {" "}
                            ({entry.option.priceDeltaCents > 0 ? "+" : "−"}
                            {formatMoney(Math.abs(entry.option.priceDeltaCents))})
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {!line.dish.isAvailable && (
                  <p className="mt-2 text-sm font-semibold text-terracotta-ink">
                    Sold out tonight — remove it to continue
                  </p>
                )}

                <div className="mt-3 flex items-center justify-between gap-4">
                  <div className="flex items-center border border-ink/15">
                    <button
                      type="button"
                      onClick={() => setQuantity(line.key, line.quantity - 1)}
                      aria-label={`Reduce ${line.dish.name} quantity`}
                      className="flex h-11 w-11 items-center justify-center text-ink-soft transition-colors duration-300 hover:text-ink"
                    >
                      <MinusIcon className="h-4 w-4" />
                    </button>
                    {/* aria-live so a change is announced without moving focus. */}
                    <span
                      aria-live="polite"
                      className="tnum min-w-10 text-center text-sm font-semibold text-ink"
                    >
                      {line.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity(line.key, line.quantity + 1)}
                      disabled={line.quantity >= MAX_LINE_QUANTITY}
                      aria-label={`Increase ${line.dish.name} quantity`}
                      className="flex h-11 w-11 items-center justify-center text-ink-soft transition-colors duration-300 hover:text-ink disabled:text-ink/25"
                    >
                      <PlusIcon className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="tnum text-sm text-ink-muted">
                      {formatMoney(line.unitPriceCents)} each
                    </span>
                    <button
                      type="button"
                      onClick={() => remove(line.key)}
                      aria-label={`Remove ${line.dish.name} from your order`}
                      className="flex h-11 w-11 items-center justify-center text-ink-muted transition-colors duration-300 hover:text-terracotta-ink"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {unavailable.length > 0 && (
          <div className="mt-6 border border-terracotta-ink/30 bg-terracotta-ink/5 px-5 py-4">
            <p className="text-sm font-semibold text-terracotta-ink">
              {unavailable.length === 1
                ? "One item is no longer on the menu"
                : `${unavailable.length} items are no longer on the menu`}
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              The kitchen changed the menu after you added them, so they cannot be
              ordered.
            </p>
            <ul className="mt-3 flex flex-wrap gap-3">
              {unavailable.map((line) => (
                <li key={line.key}>
                  <button
                    type="button"
                    onClick={() => remove(line.key)}
                    className="inline-flex min-h-11 items-center border border-ink/20 px-4 text-sm font-semibold text-ink transition-colors duration-300 hover:border-terracotta-ink hover:text-terracotta-ink"
                  >
                    Remove it
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <aside className="lg:sticky lg:top-28 lg:self-start">
        <h2 className="font-display text-2xl font-semibold text-ink">Summary</h2>
        <dl className="mt-5 space-y-3 border-y border-ink/10 py-5 text-sm">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-ink-soft">Subtotal</dt>
            <dd className="tnum font-semibold text-ink">
              {formatMoney(subtotalCents)}
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-xs leading-relaxed text-ink-muted">
          Delivery and any tax are added at the next step, once you choose pickup
          or delivery.
        </p>

        {soldOutLines.length > 0 && (
          <p role="alert" className="mt-4 text-sm font-semibold text-terracotta-ink">
            Remove the sold-out items to continue.
          </p>
        )}

        <Link
          href="/menu"
          className="mt-6 inline-flex min-h-11 items-center text-sm font-semibold text-ink-soft underline decoration-ink/25 underline-offset-4 transition-colors duration-300 hover:text-gold-ink"
        >
          Add something else
        </Link>
      </aside>
    </div>
  );
}
