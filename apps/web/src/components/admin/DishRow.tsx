"use client";

import { useActionState } from "react";
import { formatMoney } from "@bistro/shared";
import { toggleDishFlagAction, updateDishPriceAction } from "@/app/admin/actions";
import { NO_RESULT } from "@/app/admin/actionResult";
import type { AdminDish } from "@/lib/adminApi";

/**
 * One dish, editable in place.
 *
 * Both controls are real forms wired to server actions, so they work with
 * JavaScript off and there is no client-side fetch to the admin API. The token
 * stays in the httpOnly cookie and only the server ever sees it.
 */
export default function DishRow({ dish }: { dish: AdminDish }) {
  const [priceResult, savePrice, savingPrice] = useActionState(
    updateDishPriceAction,
    NO_RESULT
  );
  const [flagResult, toggleFlag, togglingFlag] = useActionState(
    toggleDishFlagAction,
    NO_RESULT
  );

  const error = !priceResult.ok
    ? priceResult.message
    : !flagResult.ok
      ? flagResult.message
      : null;

  return (
    <tr className={dish.isArchived ? "opacity-50" : undefined}>
      <td className="py-4 pr-4 align-top">
        <p className="font-semibold text-ink">{dish.name}</p>
        <p className="mt-0.5 text-xs text-ink-muted">
          {dish.category.name}
          {dish.isFeatured && " · featured"}
          {dish.isArchived && " · archived"}
        </p>
        {error && (
          <p role="alert" className="mt-1 text-xs font-semibold text-terracotta-ink">
            {error}
          </p>
        )}
        {priceResult.ok && priceResult.message && (
          <p role="status" className="mt-1 text-xs font-semibold text-gold-ink">
            {priceResult.message}
          </p>
        )}
      </td>

      <td className="py-4 pr-4 align-top">
        <form action={savePrice} className="flex items-center gap-2">
          <input type="hidden" name="id" value={dish.id} />
          <label className="sr-only" htmlFor={`price-${dish.id}`}>
            Price for {dish.name}
          </label>
          <input
            id={`price-${dish.id}`}
            name="price"
            inputMode="decimal"
            defaultValue={(dish.priceCents / 100).toFixed(2)}
            className="tnum min-h-11 w-24 border border-ink/20 bg-cream px-3 text-sm text-ink transition-colors duration-300 focus:border-gold-ink"
          />
          <button
            type="submit"
            disabled={savingPrice}
            className="min-h-11 border border-ink/20 px-4 text-xs font-semibold uppercase tracking-widest text-ink transition-colors duration-300 hover:border-gold-ink hover:text-gold-ink disabled:opacity-40"
          >
            {savingPrice ? "…" : "Save"}
          </button>
        </form>
        <p className="mt-1 text-xs text-ink-muted">
          now {formatMoney(dish.priceCents)}
        </p>
      </td>

      <td className="py-4 pr-4 align-top">
        <FlagButton
          dishId={dish.id}
          field="isAvailable"
          next={!dish.isAvailable}
          disabled={togglingFlag}
          action={toggleFlag}
          label={dish.isAvailable ? "Mark sold out" : "Back on"}
          tone={dish.isAvailable ? "quiet" : "loud"}
        />
      </td>

      <td className="py-4 align-top">
        <FlagButton
          dishId={dish.id}
          field="isArchived"
          next={!dish.isArchived}
          disabled={togglingFlag}
          action={toggleFlag}
          label={dish.isArchived ? "Restore" : "Archive"}
          tone="quiet"
        />
      </td>
    </tr>
  );
}

function FlagButton({
  dishId,
  field,
  next,
  disabled,
  action,
  label,
  tone,
}: {
  dishId: string;
  field: string;
  next: boolean;
  disabled: boolean;
  action: (formData: FormData) => void;
  label: string;
  tone: "quiet" | "loud";
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={dishId} />
      <input type="hidden" name="field" value={field} />
      <input type="hidden" name="next" value={String(next)} />
      <button
        type="submit"
        disabled={disabled}
        className={`min-h-11 whitespace-nowrap border px-4 text-xs font-semibold uppercase tracking-widest transition-colors duration-300 disabled:opacity-40 ${
          tone === "loud"
            ? "border-gold-ink bg-gold/15 text-gold-ink hover:bg-gold/25"
            : "border-ink/20 text-ink-soft hover:border-gold-ink hover:text-gold-ink"
        }`}
      >
        {label}
      </button>
    </form>
  );
}
