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
export declare function formatMoney(amountCents: number, options?: FormatMoneyOptions): string;
/**
 * Reads what someone typed into a price field and returns cents.
 * Used by the admin price input, where the owner types dollars.
 * Throws rather than guessing, so a typo cannot silently become a wrong price.
 */
export declare function parseMoneyToCents(input: string): number;
/** Inclusive range, for the schema.org priceRange field. */
export declare function formatMoneyRange(minCents: number, maxCents: number, options?: FormatMoneyOptions): string;
//# sourceMappingURL=money.d.ts.map