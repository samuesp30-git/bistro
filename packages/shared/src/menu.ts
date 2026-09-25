/**
 * The shape of `GET /api/menu`.
 *
 * These are response types, not input schemas, so they are plain TypeScript
 * rather than Zod: the API produces them and the web consumes them, and nothing
 * untrusted crosses this boundary. Request bodies are a different matter and do
 * get Zod schemas, because those arrive from a browser.
 *
 * Deliberately free of any `@prisma/client` import. The web app must be able to
 * type its props without pulling in a database client, so the enums below are
 * written as string literal unions that Prisma's generated enums assign to.
 */

/** Mirrors Prisma `SelectionType`. */
export type SelectionType = "SINGLE" | "MULTI";

/** Mirrors Prisma `TagKind`. DIETARY tags become filter chips; LABEL tags only render. */
export type TagKind = "DIETARY" | "LABEL";

export interface MenuTag {
  slug: string;
  name: string;
  kind: TagKind;
}

export interface MenuCategory {
  slug: string;
  name: string;
}

export interface MenuOption {
  id: string;
  name: string;
  /**
   * Added to the dish price when selected. Zero for a free change such as
   * "No onion", positive for an upgrade such as "Large". Never negative in the
   * seeded data, but the type allows it because a discount is the same shape.
   */
  priceDeltaCents: number;
  /** Pre-selected when the options dialog opens. */
  isDefault: boolean;
}

export interface MenuOptionGroup {
  id: string;
  name: string;
  selectionType: SelectionType;
  /** 1 or more makes the group required. */
  minSelect: number;
  /** null means unlimited. */
  maxSelect: number | null;
  options: MenuOption[];
}

export interface MenuDish {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceCents: number;
  imageUrl: string;
  categorySlug: string;
  isFeatured: boolean;
  /**
   * false is the owner's sold-out toggle. Unavailable dishes are still returned
   * and still rendered: a guest looking for tonight's special should see that it
   * ran out, not find the card silently missing. Archived dishes are the ones
   * that never appear.
   */
  isAvailable: boolean;
  tags: MenuTag[];
  optionGroups: MenuOptionGroup[];
}

export interface Menu {
  categories: MenuCategory[];
  /** Only DIETARY tags, already ordered, ready to render as filter chips. */
  dietaryTags: MenuTag[];
  dishes: MenuDish[];
}

/** The value both menu filters use to mean "do not filter on this axis". */
export const ALL_FILTER = "all";

export interface MenuFilters {
  /** Category slug, or ALL_FILTER. */
  category: string;
  /** Dietary tag slug, or ALL_FILTER. */
  diet: string;
}

/**
 * Applies the course and diet filters together, as AND.
 *
 * Pure and exported rather than inlined in the component so it can be checked
 * against real menu data without driving a browser. Order is preserved, so the
 * position the kitchen set on each dish survives filtering.
 */
export function filterDishes(
  dishes: readonly MenuDish[],
  { category, diet }: MenuFilters
): MenuDish[] {
  return dishes.filter((dish) => {
    const matchesCategory =
      category === ALL_FILTER || dish.categorySlug === category;
    const matchesDiet =
      diet === ALL_FILTER || dish.tags.some((tag) => tag.slug === diet);
    return matchesCategory && matchesDiet;
  });
}

/**
 * Lowest and highest dish price on the menu, for the `priceRange` field of the
 * Restaurant structured data. Returns null for an empty menu so the caller can
 * omit the field rather than publish a nonsense range.
 */
export function menuPriceRange(dishes: readonly MenuDish[]): { minCents: number; maxCents: number } | null {
  if (dishes.length === 0) return null;

  let minCents = Infinity;
  let maxCents = -Infinity;
  for (const dish of dishes) {
    if (dish.priceCents < minCents) minCents = dish.priceCents;
    if (dish.priceCents > maxCents) maxCents = dish.priceCents;
  }

  return { minCents, maxCents };
}
