"use client";

import { useState } from "react";
import {
  ALL_FILTER,
  filterDishes,
  type MenuCategory,
  type MenuDish,
  type MenuTag,
} from "@bistro/shared";
import MenuCard from "@/components/MenuCard";
import FilterChips from "@/components/FilterChips";

interface MenuListProps {
  categories: MenuCategory[];
  dietaryTags: MenuTag[];
  dishes: MenuDish[];
}

/**
 * The only interactive part of the menu page, so the page itself stays a server
 * component: it does the fetch and keeps its metadata, and the whole menu is in
 * the HTML for search engines. Filtering then happens here with no round trip.
 *
 * Two independent axes — course and diet — combined with AND. They are separate
 * pieces of state rather than one compound filter, because "vegetarian" is a
 * property of a dish and "Plats" is a place on the menu, and a guest avoiding
 * meat wants to keep that on while they browse the courses.
 */
export default function MenuList({
  categories,
  dietaryTags,
  dishes,
}: MenuListProps) {
  const [category, setCategory] = useState<string>(ALL_FILTER);
  const [diet, setDiet] = useState<string>(ALL_FILTER);

  const shown = filterDishes(dishes, { category, diet });

  const categoryLabel = categories.find((entry) => entry.slug === category)?.name;
  const dietName = dietaryTags.find((tag) => tag.slug === diet)?.name;
  /** "Gluten-Free" reads wrong mid-sentence; "gluten-free" does not. */
  const dietLabel = dietName?.toLocaleLowerCase();

  const filtered = category !== ALL_FILTER || diet !== ALL_FILTER;

  function clearFilters() {
    setCategory(ALL_FILTER);
    setDiet(ALL_FILTER);
  }

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

      {dietaryTags.length > 0 && (
        <div className="mt-4">
          <FilterChips
            options={dietaryTags.map((tag) => ({
              value: tag.slug,
              label: tag.name,
            }))}
            active={diet}
            onChange={setDiet}
            groupLabel="Filter the menu by dietary option"
            allLabel="Any diet"
            tone="secondary"
          />
        </div>
      )}

      <p aria-live="polite" className="mt-6 text-center text-sm text-ink-muted">
        {shown.length} {dietLabel ? `${dietLabel} ` : ""}
        {shown.length === 1 ? "dish" : "dishes"}
        {categoryLabel ? ` in ${categoryLabel}` : " on the menu"}
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
            {dietLabel
              ? `Nothing ${dietLabel}${categoryLabel ? ` under ${categoryLabel}` : " on the menu"} right now`
              : `Nothing on the menu under ${categoryLabel} right now`}
          </p>
          <p className="mt-2 text-sm text-ink-muted">
            The kitchen changes the menu with the season. Ask us about what the
            chef can adapt.
          </p>
          {filtered && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-6 inline-flex min-h-11 items-center border border-ink/20 px-6 text-sm font-semibold text-ink transition-colors duration-300 hover:border-gold-ink hover:text-gold-ink"
            >
              Show the whole menu
            </button>
          )}
        </div>
      )}
    </>
  );
}
