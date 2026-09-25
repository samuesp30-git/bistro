import type { OrderStatusValue } from "./orders";

/**
 * Who may move an order where.
 *
 * Two writers touch an order's status and they are not allowed the same moves.
 * Only the Stripe webhook may say something was paid, failed or refunded — money
 * facts come from the payment processor, never from a button in the panel. Staff
 * drive the kitchen workflow.
 *
 * PENDING_PAYMENT -> IN_KITCHEN is deliberately allowed. A restaurant that takes
 * payment on collection still cooks the food, and payment is tracked separately by
 * `paidAt` and `stripeSessionId` rather than inferred from the workflow status, so
 * starting a ticket does not erase whether it has been paid.
 */
export const STAFF_TRANSITIONS: Record<OrderStatusValue, OrderStatusValue[]> = {
  PENDING_PAYMENT: ["IN_KITCHEN", "CANCELLED"],
  PAID: ["IN_KITCHEN", "CANCELLED"],
  IN_KITCHEN: ["READY", "CANCELLED"],
  READY: ["COMPLETED", "CANCELLED"],
  // Terminal as far as staff are concerned. A refund is Stripe's to report.
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
