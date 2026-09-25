/**
 * Money is an integer number of minor units (cents) everywhere in this project:
 * in the database, in the API, in the cart and in Stripe. There is no float and
 * no conversion step, because `priceCents` maps one-to-one onto Stripe's
 * `unit_amount`.
 */

export interface FormatMoneyOptions {
  /**
   * "auto" drops the decimals on a whole amount, so 1800 renders as "$18"
   * rather than "$18.00". The menu was designed with whole prices and "auto"
   * keeps that typography unchanged while still rendering 1850 as "$18.50".
   */
  decimals?: "auto" | "always";
  currency?: string;
  locale?: string;
}

export function formatMoney(
  amountCents: number,
  options: FormatMoneyOptions = {}
): string {
  const { decimals = "auto", currency = "USD", locale = "en-US" } = options;

  if (!Number.isFinite(amountCents)) {
    throw new TypeError(`formatMoney needs a finite number, received ${amountCents}`);
  }

  const isWhole = amountCents % 100 === 0;
  const fractionDigits = decimals === "auto" && isWhole ? 0 : 2;

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amountCents / 100);
}

/**
 * Reads what someone typed into a price field and returns cents.
 * Used by the admin price input, where the owner types dollars.
 * Throws rather than guessing, so a typo cannot silently become a wrong price.
 */
export function parseMoneyToCents(input: string): number {
  const cleaned = input.trim().replace(/[^\d.,-]/g, "").replace(",", ".");

  if (cleaned === "" || !/^-?\d*\.?\d*$/.test(cleaned)) {
    throw new RangeError(`Not a price: ${JSON.stringify(input)}`);
  }

  const cents = Math.round(Number(cleaned) * 100);

  if (!Number.isFinite(cents)) {
    throw new RangeError(`Not a price: ${JSON.stringify(input)}`);
  }

  return cents;
}

/** Inclusive range, for the schema.org priceRange field. */
export function formatMoneyRange(
  minCents: number,
  maxCents: number,
  options: FormatMoneyOptions = {}
): string {
  return `${formatMoney(minCents, options)}–${formatMoney(maxCents, options)}`;
}
