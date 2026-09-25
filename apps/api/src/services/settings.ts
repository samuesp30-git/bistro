import { prisma } from "../lib/prisma";

/**
 * The settings the owner can change without a deploy.
 *
 * Stored as strings in one key/value table, because the alternative is a column
 * per knob and a migration every time the restaurant wants a new one. Parsing
 * happens here, once, with a default for every key: a missing or corrupt row must
 * not take ordering down, so a bad value falls back and is logged.
 */
export interface RestaurantSettings {
  /** False closes ordering for the night. */
  acceptingOrders: boolean;
  deliveryFeeCents: number;
  /** Basis points. 825 is 8.25%. */
  taxBps: number;
  /** Below this subtotal the kitchen will not send a driver out. */
  minOrderCents: number;
  /** How far ahead the earliest pickup slot can be. */
  pickupLeadMinutes: number;
}

const DEFAULTS: RestaurantSettings = {
  acceptingOrders: true,
  deliveryFeeCents: 499,
  taxBps: 0,
  minOrderCents: 0,
  pickupLeadMinutes: 30,
};

export async function readSettings(): Promise<RestaurantSettings> {
  const rows = await prisma.setting.findMany({
    select: { key: true, value: true },
  });
  const byKey = new Map(rows.map((row) => [row.key, row.value]));

  return {
    acceptingOrders: readBoolean(byKey, "accepting_orders", DEFAULTS.acceptingOrders),
    deliveryFeeCents: readInt(byKey, "delivery_fee_cents", DEFAULTS.deliveryFeeCents),
    taxBps: readInt(byKey, "tax_bps", DEFAULTS.taxBps),
    minOrderCents: readInt(byKey, "min_order_cents", DEFAULTS.minOrderCents),
    pickupLeadMinutes: readInt(byKey, "pickup_lead_minutes", DEFAULTS.pickupLeadMinutes),
  };
}

function readBoolean(
  values: Map<string, string>,
  key: string,
  fallback: boolean
): boolean {
  const raw = values.get(key);
  if (raw === undefined) return fallback;
  if (raw === "true") return true;
  if (raw === "false") return false;
  console.warn(`[settings] ${key} is not a boolean ("${raw}"), using ${fallback}`);
  return fallback;
}

function readInt(
  values: Map<string, string>,
  key: string,
  fallback: number
): number {
  const raw = values.get(key);
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0) {
    console.warn(`[settings] ${key} is not a non-negative integer ("${raw}"), using ${fallback}`);
    return fallback;
  }
  return parsed;
}
