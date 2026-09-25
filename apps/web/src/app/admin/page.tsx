import type { Metadata } from "next";
import { formatMoney } from "@bistro/shared";
import DishRow from "@/components/admin/DishRow";
import SignOutButton from "@/components/admin/SignOutButton";
import { fetchAdminDishes, fetchAdminStaff } from "@/lib/adminApi";

export const metadata: Metadata = {
  title: "Menu panel",
  robots: { index: false, follow: false },
};

/**
 * The owner's view of the menu.
 *
 * A server component: it reads the session cookie, calls the API with a bearer
 * token, and renders. No admin data ever travels to the browser through a client
 * fetch, and the token is never in JavaScript.
 */
export default async function AdminPage() {
  const [staff, dishes] = await Promise.all([
    fetchAdminStaff(),
    fetchAdminDishes(),
  ]);

  const live = dishes.filter((dish) => !dish.isArchived);
  const soldOut = live.filter((dish) => !dish.isAvailable);
  const prices = live.map((dish) => dish.priceCents);

  return (
    <div className="min-h-screen bg-cream px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-ink/10 pb-8">
          <div>
            <h1 className="font-display text-4xl font-semibold text-ink">
              Menu panel
            </h1>
            <p className="mt-2 text-sm text-ink-muted">
              Signed in as {staff.name} · {staff.role.toLowerCase()}
            </p>
          </div>
          <SignOutButton />
        </header>

        <dl className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-4">
          <Stat label="On the menu" value={String(live.length)} />
          <Stat label="Sold out" value={String(soldOut.length)} />
          <Stat
            label="Cheapest"
            value={prices.length ? formatMoney(Math.min(...prices)) : "—"}
          />
          <Stat
            label="Dearest"
            value={prices.length ? formatMoney(Math.max(...prices)) : "—"}
          />
        </dl>

        {soldOut.length > 0 && (
          <p className="mt-8 border border-gold-ink/25 bg-gold/10 px-5 py-4 text-sm text-ink">
            <span className="font-semibold">
              {soldOut.length === 1
                ? "One dish is marked sold out"
                : `${soldOut.length} dishes are marked sold out`}
            </span>{" "}
            — {soldOut.map((dish) => dish.name).join(", ")}. Guests see them
            flagged and cannot order them.
          </p>
        )}

        <div className="mt-10 overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <caption className="sr-only">
              Every dish, with its price and whether it is available
            </caption>
            <thead>
              <tr className="border-b border-ink/15">
                <Th>Dish</Th>
                <Th>Price</Th>
                <Th>Tonight</Th>
                <Th>Menu</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {dishes.map((dish) => (
                <DishRow key={dish.id} dish={dish} />
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-10 max-w-prose text-xs leading-relaxed text-ink-muted">
          Price changes reach the public menu on the next page load. Orders already
          placed keep the price they were charged, so editing here never rewrites a
          receipt.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
        {label}
      </dt>
      <dd className="tnum mt-1 font-display text-2xl font-semibold text-ink">
        {value}
      </dd>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      scope="col"
      className="pb-3 pr-4 text-xs font-semibold uppercase tracking-widest text-ink-muted"
    >
      {children}
    </th>
  );
}
