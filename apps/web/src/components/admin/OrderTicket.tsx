"use client";

import { useActionState } from "react";
import {
  formatMoney,
  formatOrderNumber,
  nextStaffStatuses,
  orderStatusLabel,
  transitionLabel,
} from "@bistro/shared";
import { updateOrderStatusAction } from "@/app/admin/actions";
import { NO_RESULT } from "@/app/admin/actionResult";
import type { AdminOrder } from "@/lib/adminApi";

/**
 * One ticket, as the kitchen reads it.
 *
 * The buttons offered come from the shared transition table, so the panel cannot
 * present a move the API would refuse. The API checks it again anyway, inside the
 * transaction, because two people on two tablets can press at the same moment.
 */
export default function OrderTicket({
  order,
  muted = false,
}: {
  order: AdminOrder;
  /**
   * Finished tickets sit on a darker ground rather than behind an opacity.
   * Wrapping them in opacity-70 measured ink-muted at 3.33:1 — dimming the whole
   * subtree also dims text that was already sitting at the contrast floor. A
   * different background de-emphasises the card while every word stays legible;
   * ink-muted on cream-dark is 6.00:1.
   */
  muted?: boolean;
}) {
  const [result, move, moving] = useActionState(
    updateOrderStatusAction,
    NO_RESULT
  );

  const moves = nextStaffStatuses(order.status);
  const placed = new Date(order.createdAt);
  const requested = order.requestedFor ? new Date(order.requestedFor) : null;

  return (
    <article
      className={`border border-ink/12 p-5 ${muted ? "bg-cream-dark" : "bg-cream"}`}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="tnum font-display text-xl font-semibold text-ink">
            {formatOrderNumber(order.orderNumber)}
          </h3>
          <p className="mt-0.5 text-xs text-ink-muted">
            {order.customerName} ·{" "}
            <a
              href={`tel:${order.customerPhone.replace(/[^\d+]/g, "")}`}
              className="underline decoration-ink/25 underline-offset-2 hover:text-gold-ink"
            >
              {order.customerPhone}
            </a>
          </p>
        </div>
        <div className="text-right">
          <StatusBadge status={order.status} paid={Boolean(order.paidAt)} />
          <p className="tnum mt-1 text-lg font-semibold text-ink">
            {formatMoney(order.totalCents)}
          </p>
        </div>
      </header>

      <dl className="mt-4 grid grid-cols-2 gap-3 border-y border-ink/10 py-3 text-xs">
        <div>
          <dt className="font-semibold uppercase tracking-widest text-ink-muted">
            {order.fulfillment === "PICKUP" ? "Collection" : "Delivery"}
          </dt>
          <dd className="mt-0.5 text-ink">
            {order.fulfillment === "PICKUP"
              ? "At the restaurant"
              : order.deliveryAddress ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="font-semibold uppercase tracking-widest text-ink-muted">
            Wanted
          </dt>
          <dd className="tnum mt-0.5 text-ink">
            {requested
              ? requested.toLocaleTimeString(undefined, {
                  hour: "numeric",
                  minute: "2-digit",
                })
              : "As soon as possible"}
          </dd>
        </div>
      </dl>

      <ul className="mt-3 space-y-2 text-sm">
        {order.lines.map((line) => (
          <li key={line.id} className="flex gap-3">
            <span className="tnum shrink-0 font-semibold text-ink-muted">
              {line.quantity}×
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">{line.nameSnapshot}</p>
              {line.selections.length > 0 && (
                <p className="mt-0.5 text-xs text-ink-muted">
                  {line.selections
                    .map((s) => `${s.groupNameSnapshot}: ${s.nameSnapshot}`)
                    .join(" · ")}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>

      {order.note && (
        <p className="mt-3 border-l-2 border-gold-ink/40 bg-gold/5 px-3 py-2 text-xs leading-relaxed text-ink">
          <span className="font-semibold">Note:</span> {order.note}
        </p>
      )}

      {result.message && !result.ok && (
        <p role="alert" className="mt-3 text-xs font-semibold text-terracotta-ink">
          {result.message}
        </p>
      )}

      <footer className="mt-4 flex flex-wrap items-center gap-2">
        {moves.length > 0 ? (
          moves.map((next) => (
            <form key={next} action={move}>
              <input type="hidden" name="id" value={order.id} />
              <input type="hidden" name="status" value={next} />
              <button
                type="submit"
                disabled={moving}
                className={`min-h-11 whitespace-nowrap px-4 text-xs font-semibold uppercase tracking-widest transition-colors duration-300 disabled:opacity-40 ${
                  next === "CANCELLED"
                    ? "border border-ink/20 text-ink-soft hover:border-terracotta-ink hover:text-terracotta-ink"
                    : "bg-charcoal text-cream hover:bg-ink"
                }`}
              >
                {transitionLabel(next)}
              </button>
            </form>
          ))
        ) : (
          <p className="text-xs text-ink-muted">
            Nothing left to do on this one.
          </p>
        )}
        <span className="tnum ml-auto text-xs text-ink-muted">
          {placed.toLocaleTimeString(undefined, {
            hour: "numeric",
            minute: "2-digit",
          })}
        </span>
      </footer>
    </article>
  );
}

function StatusBadge({
  status,
  paid,
}: {
  status: AdminOrder["status"];
  paid: boolean;
}) {
  /*
    Payment is shown separately from the workflow status, because they are separate
    facts: a ticket can be cooking while payment is still due on collection.
  */
  const loud = status === "READY" || status === "IN_KITCHEN";

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      <span
        className={`px-2 py-1 text-xs font-semibold uppercase tracking-widest ${
          loud
            ? "bg-gold text-charcoal"
            : "border border-ink/20 text-ink-soft"
        }`}
      >
        {orderStatusLabel(status)}
      </span>
      {paid && (
        <span className="border border-gold-ink/40 px-2 py-1 text-xs font-semibold uppercase tracking-widest text-gold-ink">
          Paid
        </span>
      )}
    </div>
  );
}
