import type { MenuOptionGroup } from "./menu";

/**
 * The line arithmetic, in one place, used by both sides.
 *
 * The web client uses it with prices from the menu response, to show a guest a
 * running total. The API uses it with prices read from the database, to compute
 * the amount that is persisted and handed to Stripe. Same function, different
 * inputs — which is the point: the client still never sends a price, and the
 * total it displays cannot quietly disagree with the total that gets charged.
 *
 * Everything is integer minor units throughout. No float ever touches money.
 */

export interface PriceLineInput {
  /** The dish price before options. */
  basePriceCents: number;
  /** One delta per selected option. Zero for a free change, positive for an upgrade. */
  optionDeltasCents: readonly number[];
  quantity: number;
}

export interface PricedLine {
  /** base + the option deltas, for one unit. */
  unitPriceCents: number;
  /** unitPriceCents * quantity. */
  lineTotalCents: number;
}

export function priceLine({
  basePriceCents,
  optionDeltasCents,
  quantity,
}: PriceLineInput): PricedLine {
  assertInteger(basePriceCents, "basePriceCents");
  assertInteger(quantity, "quantity");
  if (quantity < 1) {
    throw new RangeError(`quantity must be at least 1, received ${quantity}`);
  }

  let unitPriceCents = basePriceCents;
  for (const delta of optionDeltasCents) {
    assertInteger(delta, "optionDeltaCents");
    unitPriceCents += delta;
  }

  // A stack of discounts must never invert into money owed to the guest.
  if (unitPriceCents < 0) unitPriceCents = 0;

  return { unitPriceCents, lineTotalCents: unitPriceCents * quantity };
}

export interface OrderTotalsInput {
  subtotalCents: number;
  deliveryFeeCents?: number;
  /** Basis points, so 825 is 8.25%. Integer maths only. */
  taxBps?: number;
}

export interface OrderTotals {
  subtotalCents: number;
  deliveryFeeCents: number;
  taxCents: number;
  totalCents: number;
}

/**
 * Rolls the lines up into what the guest pays.
 *
 * Tax is expressed in basis points rather than a percentage float, so the
 * calculation stays in integers. Rounding is half-up on the final cent, which is
 * the ordinary retail convention.
 */
export function orderTotals({
  subtotalCents,
  deliveryFeeCents = 0,
  taxBps = 0,
}: OrderTotalsInput): OrderTotals {
  assertInteger(subtotalCents, "subtotalCents");
  assertInteger(deliveryFeeCents, "deliveryFeeCents");
  assertInteger(taxBps, "taxBps");

  const taxableCents = subtotalCents + deliveryFeeCents;
  const taxCents = Math.round((taxableCents * taxBps) / 10_000);

  return {
    subtotalCents,
    deliveryFeeCents,
    taxCents,
    totalCents: taxableCents + taxCents,
  };
}

/**
 * Checks a group's selection rules.
 *
 * Returns null when the selection is fine, or a message when it is not. The
 * message is shared deliberately: the dialog shows it next to the group and the
 * API returns it on a 400, so a guest cannot be told one thing by the page and
 * another by the server.
 */
export function validateGroupSelection(
  group: MenuOptionGroup,
  selectedOptionIds: readonly string[]
): string | null {
  const available = new Set(group.options.map((option) => option.id));
  const chosen = selectedOptionIds.filter((id) => available.has(id));

  if (chosen.length < group.minSelect) {
    return group.minSelect === 1
      ? `Choose an option under ${group.name}.`
      : `Choose at least ${group.minSelect} options under ${group.name}.`;
  }

  if (group.maxSelect !== null && chosen.length > group.maxSelect) {
    return group.maxSelect === 1
      ? `Only one option can be chosen under ${group.name}.`
      : `Choose at most ${group.maxSelect} options under ${group.name}.`;
  }

  if (group.selectionType === "SINGLE" && chosen.length > 1) {
    return `Only one option can be chosen under ${group.name}.`;
  }

  return null;
}

/** The options a dialog should start with: every group's defaults. */
export function defaultSelection(groups: readonly MenuOptionGroup[]): string[] {
  const selected: string[] = [];
  for (const group of groups) {
    for (const option of group.options) {
      if (option.isDefault) selected.push(option.id);
    }
  }
  return selected;
}

function assertInteger(value: number, name: string): void {
  if (!Number.isInteger(value)) {
    throw new TypeError(`${name} must be an integer of minor units, received ${value}`);
  }
}
