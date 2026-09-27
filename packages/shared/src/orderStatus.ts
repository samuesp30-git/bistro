import type { OrderStatusValue } from "./orders";

/**
 * Who may move an order where.
 *
 * Two writers touch an order's status and they are not allowed the same moves.
 * Only the payment webhook may say something was paid, failed or refunded — money
 * facts come from the payment processor, never from a button in the panel. Staff
 * drive the kitchen workflow.
 *
 * PENDING_PAYMENT -> IN_KITCHEN is deliberately allowed. A restaurant that takes
 * payment on collection still cooks the food, and payment is tracked separately by
 * `paidAt` and `paypalCaptureId` rather than inferred from the workflow status, so
 * starting a ticket does not erase whether it has been paid.
 */
export const STAFF_TRANSITIONS: Record<OrderStatusValue, OrderStatusValue[]> = {
  PENDING_PAYMENT: ["IN_KITCHEN", "CANCELLED"],
  PAID: ["IN_KITCHEN", "CANCELLED"],
  IN_KITCHEN: ["READY", "CANCELLED"],
  READY: ["COMPLETED", "CANCELLED"],
  // Terminal as far as staff are concerned. A refund is PayPal's to report.
  COMPLETED: [],
  CANCELLED: [],
  PAYMENT_FAILED: ["CANCELLED"],
  REFUNDED: [],
};

/** Statuses only the payment webhook may set. */
export const WEBHOOK_ONLY_STATUSES: OrderStatusValue[] = [
  "PAID",
  "PAYMENT_FAILED",
  "REFUNDED",
];

/**
 * What a payment webhook should do to an order already in a given status.
 *
 * Being allowed to set PAID is not the same as being allowed to overwrite the
 * status with it. A ticket can legitimately be IN_KITCHEN before the money
 * lands, because the kitchen starts cooking a pickup order that will be paid on
 * collection. A webhook that blindly wrote PAID would rewind that ticket out of
 * the kitchen queue and the food would stop being made.
 *
 * So the payment facts (`paidAt`, `paypalCaptureId`) and the workflow status are
 * decided separately. The facts are always recorded; the status moves only when
 * moving it means something.
 */
export type WebhookOutcome =
  /** Record the payment facts and move the status. */
  | "advance"
  /** Record the facts, leave the status — the ticket is already past this point. */
  | "record-only"
  /** Record the facts, leave the status, and shout: this should not happen. */
  | "conflict";

export function webhookOutcome(
  from: OrderStatusValue,
  to: OrderStatusValue
): WebhookOutcome {
  switch (to) {
    case "PAID":
      if (from === "PENDING_PAYMENT" || from === "PAYMENT_FAILED") return "advance";
      // Money arriving for an order somebody already cancelled is a real
      // situation — a payer who approved late — and it needs a human, not a
      // status change. The capture id is still stored so it can be refunded.
      if (from === "CANCELLED" || from === "REFUNDED") return "conflict";
      return "record-only";

    case "PAYMENT_FAILED":
      if (from === "PENDING_PAYMENT") return "advance";
      // A failed second attempt must not undo a first one that worked.
      return "record-only";

    case "REFUNDED":
      if (
        from === "PAID" ||
        from === "IN_KITCHEN" ||
        from === "READY" ||
        from === "COMPLETED"
      ) {
        return "advance";
      }
      if (from === "REFUNDED") return "record-only";
      // A refund against an order that was never paid.
      return "conflict";

    default:
      // Nothing else is the webhook's to set; the caller rejects it earlier.
      return "conflict";
  }
}

export function staffCanTransition(
  from: OrderStatusValue,
  to: OrderStatusValue
): boolean {
  return STAFF_TRANSITIONS[from].includes(to);
}

/** Statuses a ticket in this state can be moved to by staff. */
export function nextStaffStatuses(
  from: OrderStatusValue
): OrderStatusValue[] {
  return STAFF_TRANSITIONS[from];
}

/** True when the order still needs someone in the kitchen to act on it. */
export function isOpenOrder(status: OrderStatusValue): boolean {
  return (
    status === "PENDING_PAYMENT" ||
    status === "PAID" ||
    status === "IN_KITCHEN" ||
    status === "READY"
  );
}

/** The verb on the button that performs this transition. */
export function transitionLabel(to: OrderStatusValue): string {
  switch (to) {
    case "IN_KITCHEN":
      return "Start cooking";
    case "READY":
      return "Mark ready";
    case "COMPLETED":
      return "Complete";
    case "CANCELLED":
      return "Cancel";
    default:
      return to.toLowerCase().replace(/_/g, " ");
  }
}
