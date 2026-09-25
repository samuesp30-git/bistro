"use client";

import type { MenuCategory } from "@/data/restaurant";

export type MenuFilter = MenuCategory | "All";

interface CategoryFilterProps {
  categories: MenuCategory[];
  active: MenuFilter;
  onChange: (filter: MenuFilter) => void;
}

export default function CategoryFilter({
  categories,
  active,
  onChange,
}: CategoryFilterProps) {
  const options: MenuFilter[] = ["All", ...categories];

  return (
    <div
      role="group"
      aria-label="Filter the menu by course"
      className="flex flex-wrap justify-center gap-3"
    >
      {options.map((option) => {
        const selected = active === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            aria-pressed={selected}
            className={`flex min-h-11 items-center rounded-full px-6 text-sm transition-colors duration-300 ${
              selected
                ? "bg-gold font-semibold text-charcoal"
                : "border border-ink/15 text-ink-soft hover:border-gold-ink hover:text-ink"
            }`}
          >
            {option === "All" ? "Everything" : option}
          </button>
        );
      })}
    </div>
  );
}
