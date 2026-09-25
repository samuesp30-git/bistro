import { cookies } from "next/headers";

/**
 * The staff session, held as an httpOnly cookie on this origin only.
 *
 * The cookie carries the API's bearer token, and the browser can never read it.
 * Server components and route handlers take it out and put it in an Authorization
 * header when they call the API. The API itself has no idea cookies exist.
 *
 * That arrangement is why there is no SameSite=None, no CORS with credentials, and
 * no third-party cookie anywhere: to the browser, everything is same-origin.
 */
export const SESSION_COOKIE = "bistro_staff_session";

/** Matches the API's JWT lifetime. A cookie outliving its token is a dead session. */
const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;

export async function readSessionToken(): Promise<string | null> {
  const store = await cookies();
  const value = store.get(SESSION_COOKIE)?.value;
  return value && value.length > 0 ? value : null;
}

export interface SessionCookieOptions {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: string;
  maxAge: number;
}

/**
 * Cookie attributes, in one place so login and logout cannot disagree.
 *
 * `sameSite: "lax"` because the panel is reached by ordinary navigation and there
 * is no cross-site use for this cookie.
 *
 * `secure` follows NODE_ENV, which means `next start` sets it locally too. That is
 * fine, and worth knowing why: browsers treat localhost as a secure context, so a
 * Secure cookie is still accepted and sent over plain http there. Only `next dev`
 * leaves it off.
 */
export function sessionCookieOptions(): SessionCookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}
