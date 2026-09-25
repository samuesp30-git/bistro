import type { MenuDish, MenuOption } from "./menu";
import { priceLine } from "./pricing";

/**
 * A line as the browser stores it and as it is posted to the API.
 *
 * Note what is absent: no name, no price. The client keeps identifiers only, and
 * everything a guest is shown is resolved against the current menu. That is what
 * makes a price edit in the panel show up in an already-open cart, and it is why
 * a tampered payload cannot change what anything costs.
 */
export interface CartLine {
  /** Same dish with the same options is the same line. See cartLineKey. */
  key: string;
  dishId: string;
  optionIds: string[];
  quantity: number;
}

/** Above this, a "quantity" is a mistake or an attack, not an order. */
export const MAX_LINE_QUANTITY = 99;

/**
 * Identity of a line.
 *
 * Option ids are sorted so that picking the same two extras in a different order
 * lands on the same line and merges quantities, while a genuinely different set
 * of extras stays a separate line. This is how a till behaves: two Wagyu, one
 * medium rare and one well done, are two lines, not a quantity of two.
 */
export function cartLineKey(
  dishId: string,
  optionIds: readonly string[]
): string {
  return `${dishId}|${[...optionIds].sort().join(",")}`;
}

export interface ResolvedOption {
  groupName: string;
  option: MenuOption;
}

export interface ResolvedCartLine {
  key: string;
  dish: MenuDish;
  options: ResolvedOption[];
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
}

export interface ResolvedCart {
  lines: ResolvedCartLine[];
  subtotalCents: number;
  /**
   * Lines that no longer exist on the menu, because the dish was archived or an
   * option was withdrawn after the guest added it. Surfaced rather than dropped
   * in silence, so nobody reaches the till wondering where their dish went.
   */
  unavailable: CartLine[];
}

/**
 * Turns stored lines into something displayable, pricing each one from the menu.
 *
 * A dish that is sold out still resolves: the guest needs to see it in the cart
 * in order to understand why they cannot check out. Only dishes that have left
 * the menu entirely are reported as unavailable.
 */
export function resolveCart(
  lines: readonly CartLine[],
  dishes: readonly MenuDish[]
): ResolvedCart {
  const byId = new Map(dishes.map((dish) => [dish.id, dish]));

  const resolved: ResolvedCartLine[] = [];
  const unavailable: CartLine[] = [];

  for (const line of lines) {
    const dish = byId.get(line.dishId);
    if (!dish) {
      unavailable.push(line);
      continue;
    }

    const options: ResolvedOption[] = [];
    let anyOptionMissing = false;

    for (const optionId of line.optionIds) {
      const found = findOption(dish, optionId);
      if (!found) {
        anyOptionMissing = true;
        break;
      }
      options.push(found);
    }

    if (anyOptionMissing) {
      unavailable.push(line);
      continue;
    }

    const { unitPriceCents, lineTotalCents } = priceLine({
      basePriceCents: dish.priceCents,
      optionDeltasCents: options.map((entry) => entry.option.priceDeltaCents),
      quantity: line.quantity,
    });

    resolved.push({
      key: line.key,
      dish,
      // Grouped in menu order, not in the order the guest happened to tick them.
      options: options.sort((a, b) => a.groupName.localeCompare(b.groupName)),
      quantity: line.quantity,
      unitPriceCents,
      lineTotalCents,
    });
  }

  const subtotalCents = resolved.reduce(
    (total, line) => total + line.lineTotalCents,
    0
  );

  return { lines: resolved, subtotalCents, unavailable };
}

/** Total number of items, for the badge in the navbar. */
export function cartItemCount(lines: readonly CartLine[]): number {
  return lines.reduce((count, line) => count + line.quantity, 0);
}

function findOption(dish: MenuDish, optionId: string): ResolvedOption | null {
  for (const group of dish.optionGroups) {
    const option = group.options.find((entry) => entry.id === optionId);
    if (option) return { groupName: group.name, option };
  }
  return null;
}
