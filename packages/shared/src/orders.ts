import { z } from "zod";
import { MAX_LINE_QUANTITY } from "./cart";

/**
 * What a browser is allowed to say when it places an order.
 *
 * Read the line schema and notice what cannot be expressed: there is no price
 * field, anywhere. A client states which dish, how many, and which options, and
 * the API looks every price up for itself. Zod strips unknown keys, so a payload
 * that bolts a `priceCents` on is not rejected with a hint about what to try
 * next — the field simply never reaches the code that computes the total.
 */
export const orderLineInputSchema = z.object({
  dishId: z.string().min(1).max(64),
  quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY),
  /** Capped so a payload cannot ask the API to resolve thousands of options. */
  optionIds: z.array(z.string().min(1).max(64)).max(20),
});

export type OrderLineInput = z.infer<typeof orderLineInputSchema>;

export const FULFILLMENT_VALUES = ["PICKUP", "DELIVERY"] as const;
export type FulfillmentValue = (typeof FULFILLMENT_VALUES)[number];

export const createOrderSchema = z
  .object({
    fulfillment: z.enum(FULFILLMENT_VALUES),
    customerName: z.string().trim().min(1, "Tell us who the order is for.").max(120),
    customerPhone: z
      .string()
      .trim()
      .min(5, "A phone number lets the kitchen reach you.")
      .max(40),
    customerEmail: z.email("That email address does not look right.").max(200).optional(),
    deliveryAddress: z.string().trim().min(1).max(300).optional(),
    /** ISO 8601. null and absent both mean as soon as possible. */
    requestedFor: z.iso.datetime({ offset: true }).optional(),
    note: z.string().trim().max(500).optional(),
    lines: z
      .array(orderLineInputSchema)
      .min(1, "Your order is empty.")
      .max(50, "That is more lines than one order can carry."),
  })
  .refine(
    (order) =>
      order.fulfillment !== "DELIVERY" ||
      (order.deliveryAddress !== undefined && order.deliveryAddress.length > 0),
    {
      // The column is nullable because this rule is conditional; the rule itself
      // lives here, in the one schema both sides use.
      message: "We need an address to deliver to.",
      path: ["deliveryAddress"],
    }
  );

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const ORDER_STATUS_VALUES = [
  "PENDING_PAYMENT",
  "PAYMENT_FAILED",
  "PAID",
  "IN_KITCHEN",
  "READY",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
] as const;

export type OrderStatusValue = (typeof ORDER_STATUS_VALUES)[number];

/** What a guest is shown about their own order. */
export interface OrderSummaryLine {
  nameSnapshot: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  options: { groupName: string; name: string; priceDeltaCents: number }[];
}

export interface OrderSummary {
  orderNumber: number;
  status: OrderStatusValue;
  fulfillment: FulfillmentValue;
  customerName: string;
  deliveryAddress: string | null;
  requestedFor: string | null;
  note: string | null;
  subtotalCents: number;
  deliveryFeeCents: number;
  taxCents: number;
  totalCents: number;
  currency: string;
  createdAt: string;
  lines: OrderSummaryLine[];
}

/** What POST /api/orders answers with. */
export interface CreatedOrder {
  orderNumber: number;
  /** Capability token. The status page is reachable with this and nothing else. */
  publicToken: string;
  totalCents: number;
}

/** Human label for a status, shared so staff and guest wording cannot diverge. */
export function orderStatusLabel(status: OrderStatusValue): string {
  switch (status) {
    case "PENDING_PAYMENT":
      return "Awaiting payment";
    case "PAYMENT_FAILED":
      return "Payment failed";
    case "PAID":
      return "Paid";
    case "IN_KITCHEN":
      return "In the kitchen";
    case "READY":
      return "Ready";
    case "COMPLETED":
      return "Completed";
    case "CANCELLED":
      return "Cancelled";
    case "REFUNDED":
      return "Refunded";
  }
}

/** Formats an order number the way the guest sees it on the ticket. */
export function formatOrderNumber(orderNumber: number): string {
  return `BIS-${String(orderNumber).padStart(4, "0")}`;
}
