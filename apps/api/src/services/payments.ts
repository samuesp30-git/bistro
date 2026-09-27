import { Prisma } from "@prisma/client";
import {
  formatOrderNumber,
  webhookOutcome,
  type OrderStatusValue,
} from "@bistro/shared";
import { prisma } from "../lib/prisma";
import { env } from "../env";
import {
  capturePayPalOrder,
  createPayPalOrder,
  isPayPalConfigured,
} from "../lib/paypal";

/**
 * Everything that decides whether an order has been paid.
 *
 * The one rule this file exists to enforce: an amount is never taken from a
 * request, and "paid" is never asserted by a client. Amounts come from
 * services/pricing.ts, which reads the database; the paid flag comes from a
 * webhook whose signature verified.
 */

// ---------------------------------------------------------------------------
// Starting a payment.
// ---------------------------------------------------------------------------

export interface StartPaymentOrder {
  id: string;
  orderNumber: number;
  publicToken: string;
  totalCents: number;
  currency: string;
}

/**
 * Opens a PayPal order and returns where to send the browser.
 *
 * Returns null when PayPal is not configured, which is a supported state: the
 * order stands and is paid on collection. The alternative — failing the checkout
 * — would mean a missing environment variable loses a sale.
 */
export async function startPayment(
  order: StartPaymentOrder
): Promise<string | null> {
  if (!isPayPalConfigured()) return null;

  const returnUrl = `${env.PUBLIC_WEB_URL}/order/${order.publicToken}?payment=return`;
  const cancelUrl = `${env.PUBLIC_WEB_URL}/order/${order.publicToken}?payment=cancelled`;

  const created = await createPayPalOrder({
    referenceId: order.id,
    invoiceId: formatOrderNumber(order.orderNumber),
    currency: order.currency,
    totalCents: order.totalCents,
    description: `Bistro order ${formatOrderNumber(order.orderNumber)}`,
    returnUrl,
    cancelUrl,
    // Derived from our order id, so a retried create returns the same PayPal
    // order instead of opening a second one for the same food.
    requestId: `bistro-order-${order.id}`,
  });

  await prisma.order.update({
    where: { id: order.id },
    data: { paypalOrderId: created.id },
  });

  return created.approvalUrl;
}

// ---------------------------------------------------------------------------
// Applying a webhook.
// ---------------------------------------------------------------------------

/** The subset of a PayPal event this code reads. */
export interface PayPalEvent {
  id?: string;
  event_type?: string;
  resource?: {
    id?: string;
    status?: string;
    invoice_id?: string;
    supplementary_data?: {
      related_ids?: { order_id?: string; capture_id?: string };
    };
    purchase_units?: Array<{ invoice_id?: string; reference_id?: string }>;
  };
}

export type EventResult =
  | { handled: true; note: string }
  | { handled: false; note: string };

/**
 * Applies one verified event.
 *
 * Called only after the signature checked out. Returns rather than throws for
 * anything that is merely uninteresting — an event type we do not subscribe to,
 * an order we do not know — because throwing would give PayPal a non-2xx and earn
 * a retry of something that will never succeed.
 */
export async function applyPayPalEvent(
  event: PayPalEvent,
  transmissionId: string | undefined
): Promise<EventResult> {
  const eventId = event.id;
  const eventType = event.event_type;

  if (!eventId || !eventType) {
    return { handled: false, note: "event had no id or type" };
  }

  switch (eventType) {
    case "CHECKOUT.ORDER.APPROVED":
      return approved(event, eventId, eventType, transmissionId);

    case "PAYMENT.CAPTURE.COMPLETED":
      return settle(event, eventId, eventType, transmissionId, "PAID");

    case "PAYMENT.CAPTURE.DENIED":
    case "PAYMENT.CAPTURE.DECLINED":
      return settle(event, eventId, eventType, transmissionId, "PAYMENT_FAILED");

    case "PAYMENT.CAPTURE.REFUNDED":
    case "PAYMENT.CAPTURE.REVERSED":
      return settle(event, eventId, eventType, transmissionId, "REFUNDED");

    default:
      return { handled: false, note: `ignored event type ${eventType}` };
  }
}

/**
 * The payer approved. Take the money.
 *
 * Capture happens here rather than when the browser comes back to our return
 * URL, because the browser may never come back — a closed tab after approving
 * would leave the payment authorised and never taken. A webhook does not depend
 * on anybody's tab staying open.
 *
 * The capture call is deliberately OUTSIDE the transaction below. An HTTP request
 * inside a database transaction holds a connection open for the length of a
 * network round trip, and a slow PayPal would exhaust the pool. It is safe to run
 * first because it is idempotent twice over: PayPal-Request-Id on their side, and
 * ORDER_ALREADY_CAPTURED treated as success on ours.
 */
async function approved(
  event: PayPalEvent,
  eventId: string,
  eventType: string,
  transmissionId: string | undefined
): Promise<EventResult> {
  const paypalOrderId = event.resource?.id;
  if (!paypalOrderId) {
    return { handled: false, note: "approved event carried no order id" };
  }

  const order = await prisma.order.findUnique({
    where: { paypalOrderId },
    select: { id: true, status: true },
  });

  if (!order) {
    return { handled: false, note: `no order for PayPal order ${paypalOrderId}` };
  }

  const capture = await capturePayPalOrder(
    paypalOrderId,
    `bistro-capture-${order.id}`
  );

  if (capture.status !== "COMPLETED") {
    return {
      handled: false,
      note: `capture returned ${capture.status}, leaving the order alone`,
    };
  }

  return record({
    eventId,
    eventType,
    transmissionId,
    orderId: order.id,
    target: "PAID",
    captureId: capture.captureId,
  });
}

/**
 * A capture reached a terminal state. Mirror it onto our order.
 */
async function settle(
  event: PayPalEvent,
  eventId: string,
  eventType: string,
  transmissionId: string | undefined,
  target: OrderStatusValue
): Promise<EventResult> {
  const orderId = await resolveOrderId(event);
  if (!orderId) {
    return { handled: false, note: `could not match ${eventType} to an order` };
  }

  return record({
    eventId,
    eventType,
    transmissionId,
    orderId,
    target,
    captureId: target === "PAID" ? event.resource?.id ?? null : null,
  });
}

/**
 * Finds our order from a capture or refund event.
 *
 * Capture events describe a capture, not an order, so the PayPal order id lives
 * in supplementary_data. That field is documented but not guaranteed on every
 * event, so invoice_id — which we set to BIS-0007 when creating the order — is
 * the fallback. Two independent ways to find the row, because a webhook that
 * cannot find its order is a payment that silently never gets recorded.
 */
async function resolveOrderId(event: PayPalEvent): Promise<string | null> {
  const related = event.resource?.supplementary_data?.related_ids;

  if (related?.order_id) {
    const byPayPalOrder = await prisma.order.findUnique({
      where: { paypalOrderId: related.order_id },
      select: { id: true },
    });
    if (byPayPalOrder) return byPayPalOrder.id;
  }

  const invoiceId =
    event.resource?.invoice_id ?? event.resource?.purchase_units?.[0]?.invoice_id;

  if (invoiceId) {
    const orderNumber = parseOrderNumber(invoiceId);
    if (orderNumber !== null) {
      const byNumber = await prisma.order.findUnique({
        where: { orderNumber },
        select: { id: true },
      });
      if (byNumber) return byNumber.id;
    }
  }

  return null;
}

/** "BIS-0007" -> 7. Anything else -> null. */
function parseOrderNumber(invoiceId: string): number | null {
  const match = /^BIS-(\d+)$/.exec(invoiceId.trim());
  // The group is indexed, and this project compiles with
  // noUncheckedIndexedAccess, so it is string | undefined even though a match
  // guarantees it.
  const digits = match?.[1];
  if (digits === undefined) return null;
  const parsed = Number.parseInt(digits, 10);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

interface RecordInput {
  eventId: string;
  eventType: string;
  transmissionId: string | undefined;
  orderId: string;
  target: OrderStatusValue;
  captureId: string | null;
}

/**
 * Writes the outcome, once.
 *
 * The WebhookEvent insert and the order update share one transaction. A
 * redelivery hits the unique constraint on eventId and is reported as already
 * applied; a failure half way through rolls the marker back, so PayPal's retry
 * still has work to do. Recording the event first in its own transaction would
 * mark an event as seen that was never applied — the one ordering that turns a
 * retry into a silent loss.
 */
async function record(input: RecordInput): Promise<EventResult> {
  // Fast path, and only that. A redelivery is the normal case — PayPal retries
  // readily — and letting it hit the constraint means Prisma logs a unique
  // violation at error level every time, which trains whoever reads the logs to
  // ignore real ones. This check cannot be the guard, because two deliveries
  // arriving together would both pass it; the constraint below still is.
  const seen = await prisma.webhookEvent.findUnique({
    where: { eventId: input.eventId },
    select: { id: true },
  });
  if (seen) return { handled: true, note: "already applied" };

  try {
    return await prisma.$transaction(async (tx) => {
      await tx.webhookEvent.create({
        data: {
          eventId: input.eventId,
          eventType: input.eventType,
          transmissionId: input.transmissionId ?? null,
        },
      });

      const order = await tx.order.findUnique({
        where: { id: input.orderId },
        select: { status: true, paidAt: true },
      });

      if (!order) {
        return { handled: false as const, note: "order vanished mid-transaction" };
      }

      const outcome = webhookOutcome(order.status, input.target);

      const data: Prisma.OrderUpdateInput = {};
      if (input.captureId) data.paypalCaptureId = input.captureId;
      if (input.target === "PAID" && !order.paidAt) data.paidAt = new Date();
      if (outcome === "advance") data.status = input.target;

      await tx.order.update({ where: { id: input.orderId }, data });

      if (outcome === "advance") {
        await tx.orderEvent.create({
          data: {
            orderId: input.orderId,
            fromStatus: order.status,
            toStatus: input.target,
            source: "webhook",
            note: input.eventType,
          },
        });
      }

      if (outcome === "conflict") {
        // Not an error the caller can fix, and not something to retry. It is
        // something a person has to look at, so it is loud in the logs and the
        // payment facts are stored so a refund is still possible.
        console.warn(
          `PayPal ${input.eventType} arrived for order ${input.orderId} in status ` +
            `${order.status}; payment recorded, status left alone. Needs a human.`
        );
      }

      return {
        handled: true as const,
        note: `${input.target}: ${outcome}`,
      };
    });
  } catch (error) {
    // P2002 is the unique violation on eventId: this exact event was already
    // applied. That is the whole point of the constraint, and it is a success.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { handled: true, note: "already applied" };
    }
    throw error;
  }
}
