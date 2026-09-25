/**
 * The shape every admin action returns.
 *
 * Deliberately NOT in actions.ts. A `"use server"` module may only export async
 * functions — exporting a plain object from one throws "A 'use server' file can
 * only export async functions, found object" when the action is invoked, which
 * fails at submit time rather than at build time. So the constant lives here.
 */
export interface ActionResult {
  ok: boolean;
  message: string | null;
}

/** Initial state, before anything has been submitted. */
export const NO_RESULT: ActionResult = { ok: true, message: null };
