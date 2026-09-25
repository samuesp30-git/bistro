"use client";

import { useEffect, useRef, useState } from "react";
import {
  defaultSelection,
  formatMoney,
  priceLine,
  validateGroupSelection,
  type MenuDish,
  type MenuOptionGroup,
} from "@bistro/shared";
import { CheckIcon, CloseIcon, PlusIcon } from "@/components/icons";
import { useCart } from "@/lib/cart";

/**
 * The add button on a dish card, plus the options dialog when the dish has any.
 *
 * Split out of MenuCard so the card itself stays server-rendered markup and only
 * this part ships as an interactive component.
 *
 * A dish with no option groups is added on the first click; opening a dialog with
 * nothing to choose would be a step that asks the guest for nothing.
 */
export default function AddToOrder({ dish }: { dish: MenuDish }) {
  const { add } = useCart();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<string[]>(() =>
    defaultSelection(dish.optionGroups)
  );
  const [showErrors, setShowErrors] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const addedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasOptions = dish.optionGroups.length > 0;
  const soldOut = !dish.isAvailable;

  useEffect(() => {
    return () => {
      if (addedTimer.current) clearTimeout(addedTimer.current);
    };
  }, []);

  function flashAdded() {
    setJustAdded(true);
    if (addedTimer.current) clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(() => setJustAdded(false), 2000);
  }

  function openDialog() {
    // Reopening starts from the defaults again rather than from whatever was
    // ticked last time, which would otherwise look like a remembered preference
    // the site cannot actually honour.
    setSelected(defaultSelection(dish.optionGroups));
    setShowErrors(false);
    dialogRef.current?.showModal();
  }

  function handleClick() {
    if (soldOut) return;
    if (hasOptions) {
      openDialog();
      return;
    }
    add(dish.id, []);
    flashAdded();
  }

  const errors = dish.optionGroups.map((group) =>
    validateGroupSelection(group, selected)
  );
  const firstError = errors.find((error) => error !== null) ?? null;

  const { unitPriceCents } = priceLine({
    basePriceCents: dish.priceCents,
    optionDeltasCents: selectedDeltas(dish, selected),
    quantity: 1,
  });

  function toggleOption(group: MenuOptionGroup, optionId: string) {
    setSelected((current) => {
      const groupOptionIds = group.options.map((option) => option.id);
      const withoutGroup = current.filter((id) => !groupOptionIds.includes(id));
      const isSelected = current.includes(optionId);

      if (group.selectionType === "SINGLE") {
        // A required single-choice group cannot be emptied by clicking the
        // option that is already on; that would leave the dish in a state the
        // kitchen has no answer for.
        if (isSelected && group.minSelect > 0) return current;
        return isSelected ? withoutGroup : [...withoutGroup, optionId];
      }

      if (isSelected) return current.filter((id) => id !== optionId);

      const chosenInGroup = current.filter((id) => groupOptionIds.includes(id));
      if (group.maxSelect !== null && chosenInGroup.length >= group.maxSelect) {
        return current;
      }
      return [...current, optionId];
    });
  }

  function confirm() {
    if (firstError) {
      setShowErrors(true);
      return;
    }
    add(dish.id, selected);
    dialogRef.current?.close();
    flashAdded();
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={soldOut}
        className={`mt-5 flex min-h-11 w-full items-center justify-center gap-2 text-sm font-semibold transition-colors duration-300 ${
          soldOut
            ? "cursor-not-allowed border border-ink/10 text-ink-muted"
            : "bg-charcoal text-cream hover:bg-ink"
        }`}
      >
        {soldOut ? (
          "Sold out"
        ) : justAdded ? (
          <>
            <CheckIcon className="h-4 w-4" />
            Added to order
          </>
        ) : (
          <>
            <PlusIcon className="h-4 w-4" />
            {hasOptions ? "Choose options" : "Add to order"}
          </>
        )}
      </button>

      {hasOptions && (
        <dialog
          ref={dialogRef}
          // A native dialog brings the focus trap, Escape handling and an inert
          // background with it. Rebuilding those by hand is where home-made
          // modals go wrong.
          onClose={() => setShowErrors(false)}
          aria-labelledby={`options-title-${dish.id}`}
          className="m-auto w-[min(32rem,calc(100vw-2rem))] bg-cream p-0 text-ink shadow-2xl shadow-charcoal/30 backdrop:bg-charcoal/60"
        >
          <div className="flex items-start justify-between gap-4 border-b border-ink/10 px-6 py-5">
            <div>
              <h2
                id={`options-title-${dish.id}`}
                className="font-display text-2xl font-semibold leading-tight text-ink"
              >
                {dish.name}
              </h2>
              <p className="tnum mt-1 text-sm text-ink-muted">
                {formatMoney(dish.priceCents)} base
              </p>
            </div>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="Close without adding"
              className="-mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center text-ink-muted transition-colors duration-300 hover:text-ink"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
            {dish.optionGroups.map((group, index) => (
              <fieldset key={group.id} className="mb-6 last:mb-0">
                <legend className="text-sm font-semibold uppercase tracking-widest text-ink">
                  {group.name}
                </legend>
                <p className="mt-1 text-xs text-ink-muted">
                  {describeGroup(group)}
                </p>

                <div className="mt-3 space-y-1">
                  {group.options.map((option) => {
                    const checked = selected.includes(option.id);
                    return (
                      <label
                        key={option.id}
                        className="flex min-h-11 cursor-pointer items-center gap-3 px-1 text-sm text-ink-soft transition-colors duration-200 hover:text-ink"
                      >
                        <input
                          type={
                            group.selectionType === "SINGLE"
                              ? "radio"
                              : "checkbox"
                          }
                          name={group.id}
                          checked={checked}
                          onChange={() => toggleOption(group, option.id)}
                          className="h-4 w-4 shrink-0 accent-gold-ink"
                        />
                        <span className="flex-1">{option.name}</span>
                        {option.priceDeltaCents !== 0 && (
                          <span className="tnum shrink-0 text-sm font-semibold text-gold-ink">
                            {option.priceDeltaCents > 0 ? "+" : "−"}
                            {formatMoney(Math.abs(option.priceDeltaCents))}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>

                {showErrors && errors[index] && (
                  <p role="alert" className="mt-2 text-xs text-terracotta-ink">
                    {errors[index]}
                  </p>
                )}
              </fieldset>
            ))}
          </div>

          <div className="border-t border-ink/10 px-6 py-5">
            <button
              type="button"
              onClick={confirm}
              /*
                Deliberately not disabled while the selection is incomplete. A
                disabled button gives no reason; this one explains what is
                missing the moment it is pressed.
              */
              aria-describedby={
                showErrors && firstError ? `options-error-${dish.id}` : undefined
              }
              className="flex min-h-12 w-full items-center justify-center gap-2 bg-charcoal px-6 text-sm font-semibold text-cream transition-colors duration-300 hover:bg-ink"
            >
              Add to order
              <span aria-hidden="true">·</span>
              <span className="tnum">{formatMoney(unitPriceCents)}</span>
            </button>
            {showErrors && firstError && (
              <p
                id={`options-error-${dish.id}`}
                role="alert"
                className="mt-2 text-center text-xs text-terracotta-ink"
              >
                {firstError}
              </p>
            )}
          </div>
        </dialog>
      )}
    </>
  );
}

function selectedDeltas(dish: MenuDish, selected: readonly string[]): number[] {
  const deltas: number[] = [];
  for (const group of dish.optionGroups) {
    for (const option of group.options) {
      if (selected.includes(option.id)) deltas.push(option.priceDeltaCents);
    }
  }
  return deltas;
}

/** Turns the selection rules into something a guest can read. */
function describeGroup(group: MenuOptionGroup): string {
  const { minSelect, maxSelect, selectionType } = group;

  if (selectionType === "SINGLE") {
    return minSelect > 0 ? "Choose one" : "Choose one, or none";
  }
  if (maxSelect === null) {
    return minSelect > 0 ? `Choose at least ${minSelect}` : "Choose any";
  }
  if (minSelect > 0) {
    return `Choose ${minSelect} to ${maxSelect}`;
  }
  return maxSelect === 1 ? "Choose up to one" : `Choose up to ${maxSelect}`;
}
