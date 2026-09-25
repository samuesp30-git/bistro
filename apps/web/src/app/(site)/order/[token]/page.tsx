import type { Metadata } from "next";
import Link from "next/link";
import {
  formatMoney,
  formatOrderNumber,
  orderStatusLabel,
} from "@bistro/shared";
import PageHero from "@/components/PageHero";
import { CheckIcon } from "@/components/icons";
import { fetchOrder } from "@/lib/api";
import { restaurantInfo, telHref } from "@/data/restaurant";

export const metadata: Metadata = {
  title: "Your order",
  // A capability URL must never be indexed, or the token ends up in a search
  // result and stops being a capability.
  robots: { index: false, follow: false },
};

/**
 * One order, reached by the random token handed back when it was placed.
 *
 * Dynamic, never prerendered and never cached: the status moves as the kitchen
 * works, and the token is the only thing standing between this page and someone
 * else's dinner.
 */
export default async function OrderStatusPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const order = await fetchOrder(token);

  if (!order) {
    return (
      <>
        <PageHero
          title="We cannot find that order"
          subtitle="The link may be incomplete"
          image="https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=2000&h=1000&fit=crop"
        />
        <section className="bg-cream py-24">
          <div className="mx-auto max-w-xl px-6 text-center">
            <p className="text-base leading-relaxed text-ink-soft">
              Check the link from your confirmation, or call us on{" "}
              <a
                href={telHref}
                className="tnum font-semibold text-gold-ink underline decoration-gold-ink/30 underline-offset-4"
              >
                {restaurantInfo.phone}
              </a>{" "}
              and we will find it.
            </p>
            <Link
              href="/menu"
              className="mt-10 inline-flex min-h-12 items-center bg-charcoal px-8 text-sm font-semibold text-cream transition-colors duration-300 hover:bg-ink"
            >
              Back to the menu
            </Link>
          </div>
        </section>
      </>
    );
  }

  const placed = new Date(order.createdAt);
  const requested = order.requestedFor ? new Date(order.requestedFor) : null;

  return (
    <>
      <PageHero
        title={`Order ${formatOrderNumber(order.orderNumber)}`}
        subtitle={orderStatusLabel(order.status)}
        image="https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=2000&h=1000&fit=crop"
      />

      <section className="bg-cream py-24">
        <div className="mx-auto max-w-3xl px-6">
          <div className="flex items-start gap-4 border border-gold-ink/25 bg-gold/10 px-6 py-5">
            <CheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-gold-ink" />
            <div>
              <p className="font-semibold text-ink">
                Thank you, {order.customerName}. The kitchen has it.
              </p>
              {/* The page is max-w-3xl so the order lines have room, but running
                  prose at that width reads at ~87 characters a line. Capped to a
                  measure instead of narrowing the whole page. */}
              <p className="mt-1 max-w-prose text-sm text-ink-soft">
                Keep this page — it is how you check on the order. We will call if
                anything needs confirming.
              </p>
            </div>
          </div>

          <dl className="mt-10 grid gap-6 sm:grid-cols-2">
            <Detail
              label={order.fulfillment === "PICKUP" ? "Collection" : "Delivery"}
              value={
                order.fulfillment === "PICKUP"
                  ? restaurantInfo.address
                  : order.deliveryAddress ?? "—"
              }
            />
            <Detail
              label="When"
              value={
                requested
                  ? requested.toLocaleString(undefined, {
                      weekday: "long",
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : "As soon as it is ready"
              }
            />
            <Detail
              label="Placed"
              value={placed.toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            />
            <Detail label="Status" value={orderStatusLabel(order.status)} />
            {order.note && (
              <div className="sm:col-span-2">
                <Detail label="Your note" value={order.note} />
              </div>
            )}
          </dl>

          <h2 className="mt-14 font-display text-2xl font-semibold text-ink">
            What you ordered
          </h2>
          <ul className="mt-5 divide-y divide-ink/10 border-y border-ink/10">
            {order.lines.map((line, index) => (
              <li key={index} className="flex gap-4 py-5">
                <span className="tnum shrink-0 text-sm font-semibold text-ink-muted">
                  {line.quantity}×
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="font-semibold text-ink">{line.nameSnapshot}</p>
                    <span className="tnum shrink-0 font-semibold text-ink">
                      {formatMoney(line.lineTotalCents)}
                    </span>
                  </div>
                  {line.options.length > 0 && (
                    <ul className="mt-1 text-sm text-ink-muted">
                      {line.options.map((option, optionIndex) => (
                        <li key={optionIndex}>
                          {option.groupName}: {option.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <dl className="mt-6 ml-auto max-w-xs space-y-2 text-sm">
            <Row label="Subtotal" cents={order.subtotalCents} />
            {order.deliveryFeeCents > 0 && (
              <Row label="Delivery" cents={order.deliveryFeeCents} />
            )}
            {order.taxCents > 0 && <Row label="Tax" cents={order.taxCents} />}
            <div className="flex items-baseline justify-between gap-4 border-t border-ink/15 pt-2">
              <dt className="font-semibold text-ink">Total</dt>
              <dd className="tnum text-lg font-semibold text-ink">
                {formatMoney(order.totalCents)}
              </dd>
            </div>
          </dl>

          <div className="mt-14 text-center">
            <Link
              href="/menu"
              className="inline-flex min-h-12 items-center border border-ink/20 px-8 text-sm font-semibold text-ink transition-colors duration-300 hover:border-gold-ink hover:text-gold-ink"
            >
              Order something else
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
        {label}
      </dt>
      <dd className="mt-1 max-w-prose text-sm leading-relaxed text-ink">
        {value}
      </dd>
    </div>
  );
}

function Row({ label, cents }: { label: string; cents: number }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="tnum font-semibold text-ink">{formatMoney(cents)}</dd>
    </div>
  );
}
