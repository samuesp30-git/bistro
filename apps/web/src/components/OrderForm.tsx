"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createOrderSchema,
  formatMoney,
  type CreatedOrder,
  type FulfillmentValue,
  type MenuDish,
} from "@bistro/shared";
import { useCart, useResolvedCart } from "@/lib/cart";

interface FieldErrors {
  [field: string]: string | undefined;
}

/**
 * Pickup or delivery, who to call, and when.
 *
 * Posts identifiers and quantities only. The totals shown here come from the menu
 * and the API recomputes every one of them from the database before charging, so
 * this form has nothing to say about money.
 */
export default function OrderForm({ dishes }: { dishes: MenuDish[] }) {
  const router = useRouter();
  const { lines, clear } = useCart();
  const { canCheckout, subtotalCents, hydrated } = useResolvedCart(dishes);

  const [fulfillment, setFulfillment] = useState<FulfillmentValue>("PICKUP");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const ids = {
    name: useId(),
    phone: useId(),
    email: useId(),
    address: useId(),
    time: useId(),
    note: useId(),
  };

  // Nothing to send, nothing to ask. This also covers the pre-hydration render,
  // where the cart is always empty because the server cannot see storage.
  if (!hydrated || lines.length === 0) return null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const form = new FormData(event.currentTarget);
    const requestedForRaw = String(form.get("requestedFor") ?? "").trim();

    const payload = {
      fulfillment,
      customerName: String(form.get("customerName") ?? "").trim(),
      customerPhone: String(form.get("customerPhone") ?? "").trim(),
      customerEmail: optional(String(form.get("customerEmail") ?? "").trim()),
      deliveryAddress:
        fulfillment === "DELIVERY"
          ? optional(String(form.get("deliveryAddress") ?? "").trim())
          : undefined,
      // datetime-local has no timezone, so it is read in the guest's own zone and
      // sent as an absolute instant. Posting the naive string would make an 8pm
      // pickup mean 8pm on the server's clock, which is a different evening.
      requestedFor: requestedForRaw
        ? new Date(requestedForRaw).toISOString()
        : undefined,
      note: optional(String(form.get("note") ?? "").trim()),
      lines: lines.map((line) => ({
        dishId: line.dishId,
        quantity: line.quantity,
        optionIds: line.optionIds,
      })),
    };

    // The same schema the API validates with, run here first so an obvious
    // mistake is answered instantly rather than after a round trip.
    const parsed = createOrderSchema.safeParse(payload);
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? "form");
        next[field] ??= issue.message;
      }
      setFieldErrors(next);
      setFormError(null);
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setSubmitting(true);

    try {
      // Relative path: this goes to our own origin and is proxied to the API.
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        setFormError(
          body?.error ?? "We could not place that order. Please try again."
        );
        setSubmitting(false);
        return;
      }

      const created = (await response.json()) as CreatedOrder;

      // The cart is emptied only once the kitchen has the order.
      clear();
      router.push(`/order/${created.publicToken}`);
    } catch {
      setFormError("We could not reach the kitchen. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-16 border-t border-ink/10 pt-12">
      <h2 className="font-display text-3xl font-semibold text-ink">
        Where is it going?
      </h2>

      <fieldset className="mt-8">
        <legend className="text-sm font-semibold uppercase tracking-widest text-ink">
          Pickup or delivery
        </legend>
        <div className="mt-3 flex flex-wrap gap-3">
          {(["PICKUP", "DELIVERY"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFulfillment(option)}
              aria-pressed={fulfillment === option}
              className={`flex min-h-11 items-center rounded-full px-6 text-sm transition-colors duration-300 ${
                fulfillment === option
                  ? "bg-gold font-semibold text-charcoal"
                  : "border border-ink/15 text-ink-soft hover:border-gold-ink hover:text-ink"
              }`}
            >
              {option === "PICKUP" ? "I will collect it" : "Deliver it to me"}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <Field
          id={ids.name}
          name="customerName"
          label="Name"
          autoComplete="name"
          required
          error={fieldErrors.customerName}
        />
        <Field
          id={ids.phone}
          name="customerPhone"
          label="Phone"
          type="tel"
          autoComplete="tel"
          required
          error={fieldErrors.customerPhone}
        />
        <Field
          id={ids.email}
          name="customerEmail"
          label="Email"
          type="email"
          autoComplete="email"
          hint="Optional. For the receipt."
          error={fieldErrors.customerEmail}
        />
        <Field
          id={ids.time}
          name="requestedFor"
          label={fulfillment === "PICKUP" ? "Pickup time" : "Delivery time"}
          type="datetime-local"
          /*
            Stops the picker offering yesterday. The kitchen's actual lead time is
            enforced by the API, which knows it; this only rules out the times
            that are wrong on any setting. Safe to compute from the clock because
            this form renders only after hydration.
          */
          min={toLocalInputValue(new Date())}
          hint="Leave blank for as soon as possible."
          error={fieldErrors.requestedFor}
        />

        {fulfillment === "DELIVERY" && (
          <div className="sm:col-span-2">
            <Field
              id={ids.address}
              name="deliveryAddress"
              label="Delivery address"
              autoComplete="street-address"
              required
              error={fieldErrors.deliveryAddress}
            />
          </div>
        )}

        <div className="sm:col-span-2">
          <label
            htmlFor={ids.note}
            className="block text-sm font-semibold uppercase tracking-widest text-ink"
          >
            Anything else
          </label>
          <textarea
            id={ids.note}
            name="note"
            rows={3}
            maxLength={500}
            className="mt-2 w-full border border-ink/20 bg-cream px-4 py-3 text-sm text-ink transition-colors duration-300 placeholder:text-ink-muted focus:border-gold-ink"
            placeholder="Allergies, the buzzer code, where to leave it."
          />
        </div>
      </div>

      {formError && (
        <p
          role="alert"
          className="mt-8 border border-terracotta-ink/30 bg-terracotta-ink/5 px-5 py-4 text-sm font-semibold text-terracotta-ink"
        >
          {formError}
        </p>
      )}

      <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-muted">
          Subtotal{" "}
          <span className="tnum font-semibold text-ink">
            {formatMoney(subtotalCents)}
          </span>
          {fulfillment === "DELIVERY" && " · delivery added at the till"}
        </p>
        <button
          type="submit"
          disabled={!canCheckout || submitting}
          /*
            Disabled goes to a pale ground with muted dark text, the ordinary
            inert idiom. Leaving cream text on bg-ink/25 measured 1.69:1, so
            "Place the order" was illegible precisely when a guest is trying to
            work out why they cannot proceed. This pair is 6.00:1.
          */
          className="flex min-h-12 w-full items-center justify-center bg-charcoal px-10 text-sm font-semibold text-cream transition-colors duration-300 hover:bg-ink disabled:cursor-not-allowed disabled:bg-cream-dark disabled:text-ink-muted sm:w-auto"
        >
          {submitting ? "Sending to the kitchen…" : "Place the order"}
        </button>
      </div>
    </form>
  );
}

interface FieldProps {
  id: string;
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  hint?: string;
  error?: string | undefined;
  min?: string;
}

function Field({
  id,
  name,
  label,
  type = "text",
  autoComplete,
  required,
  hint,
  error,
  min,
}: FieldProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-semibold uppercase tracking-widest text-ink"
      >
        {label}
        {!required && (
          <span className="ml-2 font-normal normal-case tracking-normal text-ink-muted">
            optional
          </span>
        )}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        min={min}
        // Validation is ours, not the browser's, so the messages match the API's.
        aria-required={required ? true : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          [error ? errorId : null, hint ? hintId : null]
            .filter(Boolean)
            .join(" ") || undefined
        }
        className={`mt-2 min-h-11 w-full border bg-cream px-4 text-sm text-ink transition-colors duration-300 placeholder:text-ink-muted focus:border-gold-ink ${
          error ? "border-terracotta-ink" : "border-ink/20"
        }`}
      />
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-xs text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-xs text-terracotta-ink">
          {error}
        </p>
      )}
    </div>
  );
}

/** Empty strings must not reach the schema as empty strings. */
function optional(value: string): string | undefined {
  return value === "" ? undefined : value;
}

/**
 * Formats a date for a datetime-local input, which wants YYYY-MM-DDTHH:mm in the
 * viewer's own timezone. toISOString would hand it UTC and shift the value by the
 * offset, which is the classic way this field ends up an hour out.
 */
function toLocalInputValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}
