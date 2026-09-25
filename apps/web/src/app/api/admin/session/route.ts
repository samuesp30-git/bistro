import { NextResponse } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

const API_BASE_URL = process.env.API_INTERNAL_URL ?? "http://localhost:4000";

/**
 * The one place a password crosses this app.
 *
 * The browser posts credentials here, this handler forwards them to the API, and
 * the token that comes back is put straight into an httpOnly cookie. The token
 * never reaches client JavaScript, so a cross-site scripting bug cannot read the
 * session out of it.
 *
 * This is a static route path, which matters: rewrites in next.config.ts are
 * checked after static filesystem routes, so this handler wins. The public
 * allowlist there does not cover /api/admin at all, so there is no contest.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Send an email address and a password.", code: "bad_request" },
      { status: 400 }
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${API_BASE_URL}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch (error) {
    console.error("[web] admin login could not reach the API:", error);
    return NextResponse.json(
      { error: "We cannot reach the server. Try again shortly.", code: "unavailable" },
      { status: 503 }
    );
  }

  const payload = (await upstream.json().catch(() => null)) as
    | { token?: string; staff?: unknown; error?: string; code?: string }
    | null;

  if (!upstream.ok || typeof payload?.token !== "string") {
    // The API's own message is passed through, because it is already written for
    // a person and already refuses to say which half of the guess was wrong.
    return NextResponse.json(
      {
        error: payload?.error ?? "That did not work. Please try again.",
        code: payload?.code ?? "unauthorized",
      },
      { status: upstream.status === 200 ? 502 : upstream.status }
    );
  }

  const response = NextResponse.json({ staff: payload.staff });
  response.cookies.set(SESSION_COOKIE, payload.token, sessionCookieOptions());
  return response;
}

/** Signing out. Clearing the cookie is the whole of it. */
export async function DELETE(): Promise<NextResponse> {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", {
    ...sessionCookieOptions(),
    maxAge: 0,
  });
  return response;
}
