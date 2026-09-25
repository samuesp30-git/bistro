import type { Metadata } from "next";
import Link from "next/link";
import { formatMoney, isOpenOrder } from "@bistro/shared";
import AutoRefresh from "@/components/admin/AutoRefresh";
import OrderTicket from "@/components/admin/OrderTicket";
import SignOutButton from "@/components/admin/SignOutButton";
import { fetchAdminOrders } from "@/lib/adminApi";

export const metadata: Metadata = {
  title: "Orders",
  robots: { index: false, follow: false },
};

/**
 * The kitchen feed.
 *
 * A server component, re-run on an interval by AutoRefresh. Nothing about an order
 * travels to the browser through a client fetch, so the session token stays on the
 * server and there is no admin endpoint on this origin for anyone to poke at.
 */
export default async function AdminOrdersPage() {
  const { orders, fetchedAt } = await fetchAdminOrders();

  const open = orders.filter((order) => isOpenOrder(order.status));
  const done = orders.filter((order) => !isOpenOrder(order.status));
  const openValue = open.reduce((total, order) => total + order.totalCents, 0);

  return (
    <div className="min-h-screen bg-cream px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-ink/10 pb-8">
          <div>
            <h1 className="font-display text-4xl font-semibold text-ink">
              Orders
            </h1>
            <p className="tnum mt-2 text-sm text-ink-muted">
              {open.length === 0
                ? "Nothing waiting"
                : `${open.length} open · ${formatMoney(openValue)} on the board`}
              {" · checked "}
              {new Date(fetchedAt).toLocaleTimeString(undefined, {
                hour: "numeric",
                minute: "2-digit",
                second: "2-digit",
              })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <AutoRefresh />
            <Link
              href="/admin"
              className="flex min-h-11 items-center border border-ink/20 px-4 text-xs font-semibold uppercase tracking-widest text-ink-soft transition-colors duration-300 hover:border-gold-ink hover:text-gold-ink"
            >
              Menu panel
            </Link>
            <SignOutButton />
          </div>
        </header>

        {open.length === 0 && done.length === 0 ? (
          <div className="mt-12 border border-ink/10 px-6 py-20 text-center">
            <p className="font-display text-2xl font-semibold text-ink">
              No orders yet
            </p>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-ink-muted">
              They appear here the moment a guest places one, without anyone
              reloading the page.
            </p>
          </div>
        ) : (
          <>
            <section className="mt-10">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-muted">
                In the queue
              </h2>
              {open.length === 0 ? (
                <p className="mt-4 text-sm text-ink-muted">
                  The queue is clear.
                </p>
              ) : (
                <ul className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {open.map((order) => (
                    <li key={order.id} className="flex">
                      <div className="w-full">
                        <OrderTicket order={order} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {done.length > 0 && (
              <section className="mt-16">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-muted">
                  Finished today
                </h2>
                <ul className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {done.map((order) => (
                    <li key={order.id} className="flex">
                      <div className="w-full">
                        <OrderTicket order={order} muted />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
