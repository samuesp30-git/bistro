"use client";

/**
 * A row of toggle chips, one of which is active.
 *
 * Started life as CategoryFilter and was generalised when the dietary filter
 * arrived, rather than growing a second component with the same accessibility
 * work in it: `aria-pressed` on every chip so a screen reader announces the
 * state, and a 44px minimum height so the chips are a comfortable tap target.
 *
 * Values are slugs, never display names. The label is what changes when the
 * kitchen renames a course; the slug is what the filter compares.
 */

export const ALL_FILTER = "all";

export interface FilterOption {
  /** Slug. Compared against the active value. */
  value: string;
  /** What the guest reads. */
  label: string;
}

interface FilterChipsProps {
  options: FilterOption[];
  active: string;
  onChange: (value: string) => void;
  /** Names the group for assistive technology, e.g. "Filter the menu by course". */
  groupLabel: string;
  /** Label of the leading chip that clears the filter. */
  allLabel: string;
}

export default function FilterChips({
  options,
  active,
  onChange,
  groupLabel,
  allLabel,
}: FilterChipsProps) {
  const chips: FilterOption[] = [
    { value: ALL_FILTER, label: allLabel },
    ...options,
  ];

  return (
    <div
      role="group"
      aria-label={groupLabel}
      className="flex flex-wrap justify-center gap-3"
    >
      {chips.map((chip) => {
        const selected = active === chip.value;
        return (
          <button
            key={chip.value}
            type="button"
            onClick={() => onChange(chip.value)}
            aria-pressed={selected}
            className={`flex min-h-11 items-center rounded-full px-6 text-sm transition-colors duration-300 ${
              selected
                ? "bg-gold font-semibold text-charcoal"
                : "border border-ink/15 text-ink-soft hover:border-gold-ink hover:text-ink"
            }`}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
