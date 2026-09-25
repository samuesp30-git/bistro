"use client";

import { useState } from "react";
import MenuCard from "@/components/MenuCard";
import CategoryFilter, { type MenuFilter } from "@/components/CategoryFilter";
import { menuCategories, menuItems } from "@/data/restaurant";

/**
 * The only interactive part of the menu page, so the page itself stays a server
 * component and keeps its metadata.
 */
export default function MenuList() {
  const [filter, setFilter] = useState<MenuFilter>("All");

  const shown =
    filter === "All"
      ? menuItems
      : menuItems.filter((item) => item.category === filter);

  return (
    <>
      {/* The grid is a region of its own; without this the outline skips h1 to h3. */}
      <h2 className="sr-only">Dishes by course</h2>

      <CategoryFilter
        categories={menuCategories}
        active={filter}
        onChange={setFilter}
      />

      <p aria-live="polite" className="mt-6 text-center text-sm text-ink-muted">
        {shown.length} {shown.length === 1 ? "dish" : "dishes"}
        {filter === "All" ? " on the menu" : ` in ${filter}`}
      </p>

      {shown.length > 0 ? (
        <ul className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {shown.map((item) => (
            <li key={item.id} className="flex">
              <MenuCard item={item} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-10 border border-ink/10 px-6 py-16 text-center">
          <p className="font-display text-2xl font-semibold text-ink">
            Nothing on the menu under {filter} right now
          </p>
          <p className="mt-2 text-sm text-ink-muted">
            The kitchen changes this course with the season.
          </p>
          <button
            type="button"
            onClick={() => setFilter("All")}
            className="mt-6 inline-flex min-h-11 items-center border border-ink/20 px-6 text-sm font-semibold text-ink transition-colors duration-300 hover:border-gold-ink hover:text-gold-ink"
          >
            Show the whole menu
          </button>
        </div>
      )}
    </>
  );
}
