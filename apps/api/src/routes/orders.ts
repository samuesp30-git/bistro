import { Router } from "express";
import {
  createOrderSchema,
  type CreatedOrder,
  type OrderSummary,
} from "@bistro/shared";
import { prisma } from "../lib/prisma";
import { AppError } from "../lib/AppError";
import { priceOrder } from "../services/pricing";

export const ordersRouter = Router();

/**
 * Places an order.
 *
 * The body carries ids and quantities; services/pricing.ts reads every price from
 * the database and returns the amounts. Nothing here trusts a number that came
 * from a browser, and the schema has no price field for one to arrive in.
 */
ordersRouter.post("/orders", async (req, res) => {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    throw AppError.badRequest("That order is not valid.", {
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  const input = parsed.data;
  const priced = await priceOrder(input.lines, input.fulfillment);

  const requestedFor = input.requestedFor ? new Date(input.requestedFor) : null;
  if (requestedFor) {
    const earliest = new Date(
      Date.now() + priced.settings.pickupLeadMinutes * 60_000
    );
    if (requestedFor < earliest) {
      throw AppError.badRequest(
        `The kitchen needs at least ${priced.settings.pickupLeadMinutes} minutes.`,
        { earliest: earliest.toISOString() }
      );
    }
  }

  // One transaction, so an order never exists without its lines, and the audit
  // trail is written with it rather than after it.
  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        fulfillment: input.fulfillment,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        customerEmail: input.customerEmail ?? null,
        deliveryAddress:
          input.fulfillment === "DELIVERY" ? input.deliveryAddress ?? null : null,
        requestedFor,
        note: input.note ?? null,
        subtotalCents: priced.subtotalCents,
        deliveryFeeCents: priced.deliveryFeeCents,
        taxCents: priced.taxCents,
        totalCents: priced.totalCents,
        lines: {
          create: priced.lines.map((line) => ({
            dishId: line.dishId,
            nameSnapshot: line.nameSnapshot,
            basePriceCents: line.basePriceCents,
            unitPriceCents: line.unitPriceCents,
            quantity: line.quantity,
            lineTotalCents: line.lineTotalCents,
            selections: {
              create: line.options.map((option) => ({
                optionId: option.optionId,
                groupNameSnapshot: option.groupNameSnapshot,
                nameSnapshot: option.nameSnapshot,
                priceDeltaCents: option.priceDeltaCents,
              })),
            },
          })),
        },
      },
      select: { id: true, orderNumber: true, publicToken: true, totalCents: true },
    });

    await tx.orderEvent.create({
      data: {
        orderId: created.id,
        fromStatus: null,
        toStatus: "PENDING_PAYMENT",
        source: "system",
        note: "Order placed",
      },
    });

    return created;
  });

  const body: CreatedOrder = {
    orderNumber: order.orderNumber,
    publicToken: order.publicToken,
    totalCents: order.totalCents,
  };

  res.status(201).json(body);
});

/**
 * The guest's own view of their order, reached by the token handed back above.
 *
 * A capability URL rather than the order id: the token is random and unguessable,
 * so nobody can walk BIS-0001 upwards and read the neighbourhood's dinner orders.
 */
ordersRouter.get("/orders/:publicToken", async (req, res) => {
  const { publicToken } = req.params;

  const order = await prisma.order.findUnique({
    where: { publicToken },
    select: {
      orderNumber: true,
      status: true,
      fulfillment: true,
      customerName: true,
      deliveryAddress: true,
      requestedFor: true,
      note: true,
      subtotalCents: true,
      deliveryFeeCents: true,
      taxCents: true,
      totalCents: true,
      currency: true,
      createdAt: true,
      lines: {
        select: {
          nameSnapshot: true,
          quantity: true,
          unitPriceCents: true,
          lineTotalCents: true,
          selections: {
            select: {
              groupNameSnapshot: true,
              nameSnapshot: true,
              priceDeltaCents: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    throw AppError.notFound("We cannot find that order.");
  }

  const body: OrderSummary = {
    orderNumber: order.orderNumber,
    status: order.status,
    fulfillment: order.fulfillment,
    customerName: order.customerName,
    deliveryAddress: order.deliveryAddress,
    requestedFor: order.requestedFor?.toISOString() ?? null,
    note: order.note,
    subtotalCents: order.subtotalCents,
    deliveryFeeCents: order.deliveryFeeCents,
    taxCents: order.taxCents,
    totalCents: order.totalCents,
    currency: order.currency,
    createdAt: order.createdAt.toISOString(),
    lines: order.lines.map((line) => ({
      nameSnapshot: line.nameSnapshot,
      quantity: line.quantity,
      unitPriceCents: line.unitPriceCents,
      lineTotalCents: line.lineTotalCents,
      options: line.selections.map((selection) => ({
        groupName: selection.groupNameSnapshot,
        name: selection.nameSnapshot,
        priceDeltaCents: selection.priceDeltaCents,
      })),
    })),
  };

  // A guest's own order is never cached by a shared cache.
  res.setHeader("Cache-Control", "no-store");
  res.json(body);
});
