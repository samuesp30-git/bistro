import { redirect } from "next/navigation";
import type { MenuCategory, OrderStatusValue } from "@bistro/shared";
import { readSessionToken } from "./session";

const API_BASE_URL = process.env.API_INTERNAL_URL ?? "http://localhost:4000";

/** A dish as the panel sees it, including what the public menu hides. */
export interface AdminDish {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceCents: number;
  imageUrl: string;
  isFeatured: boolean;
  isAvailable: boolean;
  isArchived: boolean;
  position: number;
  updatedAt: string;
  category: MenuCategory;
}

export interface AdminStaff {
  id: string;
  email: string;
  name: string;
  role: "OWNER" | "STAFF";
}

/**
 * Calls the admin API as the signed-in staff member.
 *
 * Server-side only. It reads the httpOnly cookie and turns it into the bearer
 * token the API wants, which is the entire job of this layer: the browser holds a
 * cookie it cannot read, and the API only ever sees an Authorization header.
 *
 * A 401 means the session is gone or the account was disabled, so it redirects to
 * sign-in rather than returning a shape every caller would have to check. That is
 * a throw, so nothing after it runs.
 */
async function adminFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const token = await readSessionToken();
  if (!token) redirect("/admin/login");

  const response = await fetch(`${API_BASE_URL}/api/admin${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${token}`,
    },
    // The panel shows live operational state. Nothing here may be cached.
    cache: "no-store",
  });

  if (response.status === 401) {
    redirect("/admin/login?expired=1");
  }

  return response;
}

export async function fetchAdminDishes(): Promise<AdminDish[]> {
  const response = await adminFetch("/dishes");
  if (!response.ok) {
    throw new Error(`GET /api/admin/dishes responded ${response.status}`);
  }
  const body = (await response.json()) as { dishes: AdminDish[] };
  return body.dishes;
}

export async function fetchAdminStaff(): Promise<AdminStaff> {
  const response = await adminFetch("/me");
  if (!response.ok) {
    throw new Error(`GET /api/admin/me responded ${response.status}`);
  }
  const body = (await response.json()) as { staff: AdminStaff };
  return body.staff;
}

export interface DishPatch {
  priceCents?: number;
  isAvailable?: boolean;
  isFeatured?: boolean;
  isArchived?: boolean;
  name?: string;
  description?: string;
}

/** Applies one edit. Returns the API's message on failure rather than throwing. */
export async function patchAdminDish(
  id: string,
  patch: DishPatch
): Promise<{ ok: true } | { ok: false; error: string }> {
  const response = await adminFetch(`/dishes/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });

  if (response.ok) return { ok: true };

  const body = (await response.json().catch(() => null)) as
    | { error?: string }
    | null;
  return {
    ok: false,
    error: body?.error ?? `That change was refused (${response.status}).`,
  };
}

export interface AdminOrderLine {
  id: string;
  nameSnapshot: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  selections: { groupNameSnapshot: string; nameSnapshot: string }[];
}

export interface AdminOrder {
  id: string;
  orderNumber: number;
  status: OrderStatusValue;
  fulfillment: "PICKUP" | "DELIVERY";
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  deliveryAddress: string | null;
  requestedFor: string | null;
  note: string | null;
  subtotalCents: number;
  deliveryFeeCents: number;
  taxCents: number;
  totalCents: number;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  lines: AdminOrderLine[];
}

export async function fetchAdminOrders(): Promise<{
  orders: AdminOrder[];
  fetchedAt: string;
}> {
  const response = await adminFetch("/orders");
  if (!response.ok) {
    throw new Error(`GET /api/admin/orders responded ${response.status}`);
  }
  return (await response.json()) as { orders: AdminOrder[]; fetchedAt: string };
}

/** Moves a ticket. Returns the API's message on refusal rather than throwing. */
export async function patchAdminOrderStatus(
  id: string,
  status: OrderStatusValue
): Promise<{ ok: true } | { ok: false; error: string }> {
  const response = await adminFetch(`/orders/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });

  if (response.ok) return { ok: true };

  const body = (await response.json().catch(() => null)) as
    | { error?: string }
    | null;
  return {
    ok: false,
    error: body?.error ?? `That move was refused (${response.status}).`,
  };
}
