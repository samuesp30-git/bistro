"use client";

import { useState } from "react";
import type { MenuCategory, MenuDish } from "@bistro/shared";
import MenuCard from "@/components/MenuCard";
import FilterChips, { ALL_FILTER } from "@/components/FilterChips";

interface MenuListProps {
  categories: MenuCategory[];
  dishes: MenuDish[];
}

/**
 * The only interactive part of the menu page, so the page itself stays a server
 * component: it does the fetch and keeps its metadata, and the whole menu is in
 * the HTML for search engines. Filtering then happens here with no round trip.
 */
export default function MenuList({ categories, dishes }: MenuListProps) {
  const [category, setCategory] = useState<string>(ALL_FILTER);

  const shown =
    category === ALL_FILTER
      ? dishes
      : dishes.filter((dish) => dish.categorySlug === category);

  const activeLabel =
    categories.find((entry) => entry.slug === category)?.name ?? category;

  return (
    <>
      {/* The grid is a region of its own; without this the outline skips h1 to h3. */}
      <h2 className="sr-only">Dishes by course</h2>

      <FilterChips
        options={categories.map((entry) => ({
          value: entry.slug,
          label: entry.name,
        }))}
        active={category}
        onChange={setCategory}
        groupLabel="Filter the menu by course"
        allLabel="Everything"
      />

      <p aria-live="polite" className="mt-6 text-center text-sm text-ink-muted">
        {shown.length} {shown.length === 1 ? "dish" : "dishes"}
        {category === ALL_FILTER ? " on the menu" : ` in ${activeLabel}`}
      </p>

      {shown.length > 0 ? (
        <ul className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {shown.map((dish) => (
            <li key={dish.id} className="flex">
              <MenuCard dish={dish} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-10 border border-ink/10 px-6 py-16 text-center">
          <p className="font-display text-2xl font-semibold text-ink">
            Nothing on the menu under {activeLabel} right now
          </p>
          <p className="mt-2 text-sm text-ink-muted">
            The kitchen changes this course with the season.
          </p>
          <button
            type="button"
            onClick={() => setCategory(ALL_FILTER)}
            className="mt-6 inline-flex min-h-11 items-center border border-ink/20 px-6 text-sm font-semibold text-ink transition-colors duration-300 hover:border-gold-ink hover:text-gold-ink"
          >
            Show the whole menu
          </button>
        </div>
      )}
    </>
  );
}
