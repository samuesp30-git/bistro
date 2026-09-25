import {
  orderTotals,
  priceLine,
  validateGroupSelection,
  type OrderLineInput,
} from "@bistro/shared";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../lib/AppError";
import { readSettings, type RestaurantSettings } from "./settings";

/**
 * The only place on the server where an order amount is decided.
 *
 * Every price and every option delta is read from the database here, inside one
 * function, from ids the client supplied. The client's payload has no price field
 * to begin with, and this code never looks for one. The amount that goes to
 * Stripe is derived from what this returns and is persisted alongside the order,
 * so what is charged, what is stored and what is shown all come from one
 * calculation.
 *
 * If a second place ever needs to total an order, it calls this. It does not
 * reimplement it.
 */

const dishForPricingSelect = {
  id: true,
  name: true,
  priceCents: true,
  isAvailable: true,
  isArchived: true,
  optionGroups: {
    select: {
      id: true,
      name: true,
      selectionType: true,
      minSelect: true,
      maxSelect: true,
      options: {
        select: {
          id: true,
          name: true,
          priceDeltaCents: true,
          isDefault: true,
          isAvailable: true,
        },
      },
    },
  },
} satisfies Prisma.DishSelect;

export interface PricedOrderLine {
  dishId: string;
  nameSnapshot: string;
  basePriceCents: number;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
  options: {
    optionId: string;
    groupNameSnapshot: string;
    nameSnapshot: string;
    priceDeltaCents: number;
  }[];
}

export interface PricedOrder {
  lines: PricedOrderLine[];
  subtotalCents: number;
  deliveryFeeCents: number;
  taxCents: number;
  totalCents: number;
  settings: RestaurantSettings;
}

export async function priceOrder(
  lines: readonly OrderLineInput[],
  fulfillment: "PICKUP" | "DELIVERY"
): Promise<PricedOrder> {
  const settings = await readSettings();

  if (!settings.acceptingOrders) {
    throw AppError.conflict(
      "We have stopped taking orders for now. Please try again later."
    );
  }

  const dishIds = [...new Set(lines.map((line) => line.dishId))];
  const dishes = await prisma.dish.findMany({
    where: { id: { in: dishIds } },
    select: dishForPricingSelect,
  });
  const dishById = new Map(dishes.map((dish) => [dish.id, dish]));

  const priced: PricedOrderLine[] = [];

  for (const line of lines) {
    const dish = dishById.get(line.dishId);

    // A missing id and an archived dish are the same thing to a guest: it is not
    // on the menu. Saying which is which would confirm that an id exists.
    if (!dish || dish.isArchived) {
      throw AppError.badRequest("One of those dishes is no longer on the menu.", {
        dishId: line.dishId,
      });
    }

    if (!dish.isAvailable) {
      throw AppError.conflict(`${dish.name} has sold out.`, { dishId: dish.id });
    }

    // Resolve each option against this dish, so an id borrowed from another dish
    // cannot smuggle in a cheaper upgrade.
    const resolved = line.optionIds.map((optionId) => {
      for (const group of dish.optionGroups) {
        const option = group.options.find((entry) => entry.id === optionId);
        if (!option) continue;
        if (!option.isAvailable) {
          throw AppError.conflict(
            `${option.name} is not available on ${dish.name} right now.`,
            { optionId }
          );
        }
        return { group, option };
      }
      throw AppError.badRequest(
        `That option is not offered on ${dish.name}.`,
        { optionId }
      );
    });

    // The same rules the dialog enforced, applied again here. The dialog is a
    // convenience; this is the boundary.
    for (const group of dish.optionGroups) {
      const message = validateGroupSelection(
        {
          id: group.id,
          name: group.name,
          selectionType: group.selectionType,
          minSelect: group.minSelect,
          maxSelect: group.maxSelect,
          options: group.options.map((option) => ({
            id: option.id,
            name: option.name,
            priceDeltaCents: option.priceDeltaCents,
            isDefault: option.isDefault,
          })),
        },
        line.optionIds
      );
      if (message) throw AppError.badRequest(message, { dishId: dish.id });
    }

    const { unitPriceCents, lineTotalCents } = priceLine({
      basePriceCents: dish.priceCents,
      optionDeltasCents: resolved.map((entry) => entry.option.priceDeltaCents),
      quantity: line.quantity,
    });

    priced.push({
      dishId: dish.id,
      // Snapshots, so editing a price later cannot rewrite this receipt.
      nameSnapshot: dish.name,
      basePriceCents: dish.priceCents,
      unitPriceCents,
      quantity: line.quantity,
      lineTotalCents,
      options: resolved.map((entry) => ({
        optionId: entry.option.id,
        groupNameSnapshot: entry.group.name,
        nameSnapshot: entry.option.name,
        priceDeltaCents: entry.option.priceDeltaCents,
      })),
    });
  }

  const subtotalCents = priced.reduce(
    (total, line) => total + line.lineTotalCents,
    0
  );

  if (subtotalCents < settings.minOrderCents) {
    throw AppError.conflict("That is below our minimum order.", {
      minOrderCents: settings.minOrderCents,
      subtotalCents,
    });
  }

  const totals = orderTotals({
    subtotalCents,
    // Pickup never pays for delivery.
    deliveryFeeCents: fulfillment === "DELIVERY" ? settings.deliveryFeeCents : 0,
    taxBps: settings.taxBps,
  });

  return { lines: priced, ...totals, settings };
}
