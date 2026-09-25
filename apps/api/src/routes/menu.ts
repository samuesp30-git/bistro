import { Router } from "express";
import { Prisma } from "@prisma/client";
import type { Menu, MenuDish } from "@bistro/shared";
import { prisma } from "../lib/prisma";

export const menuRouter = Router();

/**
 * Every column that leaves the database for the public menu, listed explicitly.
 *
 * `select` rather than `include` on purpose: a future column on `dishes` should
 * not silently start appearing in a public response because someone added it to
 * the schema. This also keeps the inferred row type narrow, so the serializer
 * below is checked against exactly these fields.
 *
 * Wrapped in `Prisma.validator` rather than declared `as const`. Both keep the
 * literal types that `DishGetPayload` needs, but `as const` also makes the
 * `orderBy` arrays readonly, and Prisma's input types only accept mutable ones.
 */
const dishSelect = Prisma.validator<Prisma.DishSelect>()({
  id: true,
  slug: true,
  name: true,
  description: true,
  priceCents: true,
  imageUrl: true,
  isFeatured: true,
  isAvailable: true,
  category: { select: { slug: true } },
  tags: {
    select: { slug: true, name: true, kind: true },
    orderBy: [{ position: "asc" }, { name: "asc" }],
  },
  optionGroups: {
    select: {
      id: true,
      name: true,
      selectionType: true,
      minSelect: true,
      maxSelect: true,
      options: {
        // An option the kitchen ran out of disappears from the dialog. Unlike a
        // sold-out dish there is nothing useful to show a guest about a missing
        // choice, and leaving it selectable would let them order it.
        where: { isAvailable: true },
        select: { id: true, name: true, priceDeltaCents: true, isDefault: true },
        orderBy: [{ position: "asc" }, { name: "asc" }],
      },
    },
    orderBy: [{ position: "asc" }, { name: "asc" }],
  },
});

type DishRow = Prisma.DishGetPayload<{ select: typeof dishSelect }>;

function toMenuDish(dish: DishRow): MenuDish {
  return {
    id: dish.id,
    slug: dish.slug,
    name: dish.name,
    description: dish.description,
    priceCents: dish.priceCents,
    imageUrl: dish.imageUrl,
    categorySlug: dish.category.slug,
    isFeatured: dish.isFeatured,
    isAvailable: dish.isAvailable,
    tags: dish.tags.map((tag) => ({ slug: tag.slug, name: tag.name, kind: tag.kind })),
    optionGroups: dish.optionGroups.map((group) => ({
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
    })),
  };
}

/**
 * The whole menu in one request: categories, the dietary tags that become filter
 * chips, and every dish with its option groups.
 *
 * One request rather than three because the menu page needs all of it before it
 * can render, and the filtering happens in the browser with no further round
 * trips. The payload is a few kilobytes for a restaurant-sized menu.
 */
menuRouter.get("/menu", async (_req, res) => {
  const [categories, dietaryTags, dishes] = await Promise.all([
    prisma.category.findMany({
      select: { slug: true, name: true },
      orderBy: [{ position: "asc" }, { name: "asc" }],
    }),
    prisma.tag.findMany({
      where: { kind: "DIETARY" },
      select: { slug: true, name: true, kind: true },
      orderBy: [{ position: "asc" }, { name: "asc" }],
    }),
    prisma.dish.findMany({
      // Archived is the soft delete. Sold out is not: see MenuDish.isAvailable.
      where: { isArchived: false },
      select: dishSelect,
      orderBy: [{ position: "asc" }, { name: "asc" }],
    }),
  ]);

  const body: Menu = {
    categories,
    dietaryTags,
    dishes: dishes.map(toMenuDish),
  };

  res.json(body);
});
