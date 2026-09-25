"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  cartItemCount,
  cartLineKey,
  MAX_LINE_QUANTITY,
  type CartLine,
} from "@bistro/shared";

const STORAGE_KEY = "bistro.cart.v1";

interface CartContextValue {
  lines: CartLine[];
  itemCount: number;
  /**
   * False until the stored cart has been read.
   *
   * Server and first client render must agree, and the server cannot know what is
   * in this browser's storage, so the cart always starts empty and is filled in
   * an effect. Anything that would flicker — a badge, a total — waits on this
   * instead of rendering a zero it is about to replace.
   */
  hydrated: boolean;
  add: (dishId: string, optionIds: readonly string[], quantity?: number) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Read once on mount. Storage can be unavailable in a private window or with
  // site data blocked, and the accessor itself can throw, so a failure here just
  // means an empty cart rather than a blank page.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setLines(parseStoredLines(raw));
    } catch {
      // No storage, no saved cart. Nothing else to do.
    }
    setHydrated(true);
  }, []);

  // Persist after every change, but never before the initial read, or the empty
  // starting state would overwrite the cart we are about to load.
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // Over quota or storage disabled. The cart still works for this visit.
    }
  }, [lines, hydrated]);

  const add = useCallback(
    (dishId: string, optionIds: readonly string[], quantity = 1) => {
      const key = cartLineKey(dishId, optionIds);
      setLines((current) => {
        const existing = current.find((line) => line.key === key);
        if (existing) {
          return current.map((line) =>
            line.key === key
              ? { ...line, quantity: clampQuantity(line.quantity + quantity) }
              : line
          );
        }
        return [
          ...current,
          {
            key,
            dishId,
            optionIds: [...optionIds].sort(),
            quantity: clampQuantity(quantity),
          },
        ];
      });
    },
    []
  );

  const setQuantity = useCallback((key: string, quantity: number) => {
    // Stepping down from one removes the line, which is what a guest means when
    // they press minus on a single item.
    if (quantity < 1) {
      setLines((current) => current.filter((line) => line.key !== key));
      return;
    }
    setLines((current) =>
      current.map((line) =>
        line.key === key ? { ...line, quantity: clampQuantity(quantity) } : line
      )
    );
  }, []);

  const remove = useCallback((key: string) => {
    setLines((current) => current.filter((line) => line.key !== key));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      itemCount: cartItemCount(lines),
      hydrated,
      add,
      setQuantity,
      remove,
      clear,
    }),
    [lines, hydrated, add, setQuantity, remove, clear]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside a CartProvider");
  }
  return context;
}

function clampQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) return 1;
  return Math.min(Math.max(Math.trunc(quantity), 1), MAX_LINE_QUANTITY);
}

/**
 * Reads whatever is in storage without trusting it.
 *
 * This string survives across releases and can be edited by hand in devtools, so
 * every field is checked and anything malformed is dropped rather than allowed to
 * become a NaN quantity or an undefined id halfway through a checkout.
 */
function parseStoredLines(raw: string): CartLine[] {
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) return [];

  const lines: CartLine[] = [];

  for (const entry of parsed) {
    if (typeof entry !== "object" || entry === null) continue;
    const candidate = entry as Record<string, unknown>;

    const dishId = candidate.dishId;
    const quantity = candidate.quantity;
    const optionIds = candidate.optionIds;

    if (typeof dishId !== "string" || dishId === "") continue;
    if (typeof quantity !== "number" || !Number.isFinite(quantity)) continue;
    if (!Array.isArray(optionIds)) continue;
    if (!optionIds.every((id): id is string => typeof id === "string")) continue;

    const sorted = [...optionIds].sort();
    lines.push({
      // Recomputed rather than trusted, so a stale or hand-edited key cannot
      // split what should be one line.
      key: cartLineKey(dishId, sorted),
      dishId,
      optionIds: sorted,
      quantity: clampQuantity(quantity),
    });
  }

  return lines;
}
