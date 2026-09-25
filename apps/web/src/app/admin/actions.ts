"use server";

import { revalidatePath } from "next/cache";
import { parseMoneyToCents } from "@bistro/shared";
import { patchAdminDish, type DishPatch } from "@/lib/adminApi";
import type { ActionResult } from "./actionResult";

/**
 * Paths whose cached copy is stale the moment a dish changes.
 *
 * Without this the public pages would carry the old price for up to their
 * revalidation window — a minute of the site quoting a price the owner has already
 * changed. Clearing them here makes an edit visible on the next request instead.
 *
 * /order is included because the cart prices itself from the menu that page
 * fetches.
 */
const PUBLIC_MENU_PATHS = ["/", "/menu", "/menu/scan", "/order"];

function revalidatePublicMenu(): void {
  for (const path of PUBLIC_MENU_PATHS) revalidatePath(path);
  revalidatePath("/admin");
}

/**
 * Changes a dish price.
 *
 * The typed value is parsed to integer cents here, so "24.50" and "$24.50" both
 * work and nothing downstream sees a float. The API validates the result again and
 * is the authority; this is only the nicety of accepting what a person would type.
 */
export async function updateDishPriceAction(
  _previous: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const raw = String(formData.get("price") ?? "").trim();

  if (!id) return { ok: false, message: "Missing dish." };
  if (raw === "") return { ok: false, message: "Enter a price." };

  let priceCents: number;
  try {
    priceCents = parseMoneyToCents(raw);
  } catch {
    return { ok: false, message: `"${raw}" is not a price.` };
  }

  const result = await patchAdminDish(id, { priceCents });
  if (!result.ok) return { ok: false, message: result.error };

  revalidatePublicMenu();
  return { ok: true, message: "Saved" };
}

/** Flips one boolean: sold out, featured, or archived. */
export async function toggleDishFlagAction(
  _previous: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const field = String(formData.get("field") ?? "");
  const next = String(formData.get("next") ?? "") === "true";

  const allowed: (keyof DishPatch)[] = ["isAvailable", "isFeatured", "isArchived"];
  if (!id || !allowed.includes(field as keyof DishPatch)) {
    // The field name arrives in a form body, so it is checked against a list
    // rather than passed through into the patch.
    return { ok: false, message: "That is not a field we can change." };
  }

  const result = await patchAdminDish(id, { [field]: next } as DishPatch);
  if (!result.ok) return { ok: false, message: result.error };

  revalidatePublicMenu();
  return { ok: true, message: null };
}
