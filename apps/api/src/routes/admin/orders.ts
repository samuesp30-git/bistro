import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import {
  ORDER_STATUS_VALUES,
  staffCanTransition,
  WEBHOOK_ONLY_STATUSES,
  type OrderStatusValue,
} from "@bistro/shared";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/AppError";
import { currentStaff } from "../../middleware/requireStaff";

export const adminOrdersRouter = Router();

const adminOrderSelect = Prisma.validator<Prisma.OrderSelect>()({
  id: true,
  orderNumber: true,
  status: true,
  fulfillment: true,
  customerName: true,
  customerPhone: true,
  customerEmail: true,
  deliveryAddress: true,
  requestedFor: true,
  note: true,
  subtotalCents: true,
  deliveryFeeCents: true,
  taxCents: true,
  totalCents: true,
  paidAt: true,
  createdAt: true,
  updatedAt: true,
  lines: {
    select: {
      id: true,
      nameSnapshot: true,
      quantity: true,
      unitPriceCents: true,
      lineTotalCents: true,
      selections: {
        select: { groupNameSnapshot: true, nameSnapshot: true },
      },
    },
  },
});

const feedQuerySchema = z.object({
  status: z.enum(ORDER_STATUS_VALUES).optional(),
  /** ISO instant. Only orders touched since then. */
  since: z.iso.datetime({ offset: true }).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

/**
 * The kitchen feed.
 *
 * Ordered oldest first, because a queue is worked from the front: the ticket that
 * has been waiting longest is the one that matters. The public menu sorts the other
 * way, which is why this is stated rather than left to a default.
 */
adminOrdersRouter.get("/orders", async (req, res) => {
  const parsed = feedQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw AppError.badRequest("That filter is not valid.", {
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  const { status, since, limit } = parsed.data;

  const orders = await prisma.order.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(since ? { updatedAt: { gte: new Date(since) } } : {}),
    },
    select: adminOrderSelect,
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  res.setHeader("Cache-Control", "no-store");
  res.json({ orders, fetchedAt: new Date().toISOString() });
});

const transitionSchema = z.object({
  status: z.enum(ORDER_STATUS_VALUES),
  note: z.string().trim().max(300).optional(),
});

/**
 * Moves a ticket through the kitchen.
 *
 * The transition is checked against the order's current status inside the same
 * transaction that writes it, so two members of staff pressing the same button at
 * once cannot both succeed and skip a step. The losing request gets a 409 telling
 * it where the order actually is now.
 */
adminOrdersRouter.patch("/orders/:id", async (req, res) => {
  const parsed = transitionSchema.safeParse(req.body);
  if (!parsed.success) {
    throw AppError.badRequest("That is not a status we recognise.");
  }

  const { status: nextStatus, note } = parsed.data;
  const { id } = req.params;
  const staff = currentStaff(req);

  if (WEBHOOK_ONLY_STATUSES.includes(nextStatus)) {
    // Whether money moved is Stripe's to report. A panel button must never be
    // able to claim an order was paid or refunded.
    throw AppError.forbidden(
      `${nextStatus} is set by the payment processor, not from the panel.`
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const current = await tx.order.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!current) throw AppError.notFound("That order does not exist.");

    const from = current.status as OrderStatusValue;

    if (from === nextStatus) {
      // Idempotent rather than an error: a double-tap or a retry should not look
      // like a failure to whoever pressed the button.
      return tx.order.findUniqueOrThrow({
        where: { id },
        select: adminOrderSelect,
      });
    }

    if (!staffCanTransition(from, nextStatus)) {
      throw AppError.conflict(
        `An order that is ${humanise(from)} cannot be moved to ${humanise(nextStatus)}.`,
        { from, to: nextStatus }
      );
    }

    await tx.order.update({
      where: { id },
      data: { status: nextStatus },
    });

    await tx.orderEvent.create({
      data: {
        orderId: id,
        fromStatus: from,
        toStatus: nextStatus,
        actorStaffId: staff.id,
        source: "staff",
        note: note ?? null,
      },
    });

    return tx.order.findUniqueOrThrow({
      where: { id },
      select: adminOrderSelect,
    });
  });

  res.setHeader("Cache-Control", "no-store");
  res.json({ order: updated });
});

function humanise(status: OrderStatusValue): string {
  return status.toLowerCase().replace(/_/g, " ");
}
