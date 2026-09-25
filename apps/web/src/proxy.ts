import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

/**
 * Sends a visitor without a session to the sign-in page.
 *
 * Named `proxy`, not `middleware`: Next 16 deprecated that file convention and
 * renamed it, which is verified in node_modules/next/dist/docs/.../proxy.md.
 *
 * This is NOT the security boundary, and it is important not to mistake it for
 * one. It only checks that a cookie is present — it does not verify the token,
 * because the docs are explicit that proxy runs apart from render code and may be
 * deployed to a CDN, so it must not depend on shared modules or secrets. A forged
 * cookie gets past this and then fails at the API, which re-reads the staff member
 * from the database on every single request. Treating middleware as the gate is a
 * well-worn way to ship an open admin panel.
 *
 * So: this is a redirect for people who are not signed in, and nothing more.
 */
export function proxy(request: NextRequest): NextResponse {
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (hasSession) return NextResponse.next();

  const signIn = new URL("/admin/login", request.url);
  // Remember where they were headed so signing in lands them there.
  const { pathname, search } = request.nextUrl;
  if (pathname !== "/admin") {
    signIn.searchParams.set("next", `${pathname}${search}`);
  }
  return NextResponse.redirect(signIn);
}

export const config = {
  /*
    Everything under /admin except the sign-in page itself, which would otherwise
    redirect to itself forever.
  */
  matcher: ["/admin", "/admin/((?!login).*)"],
};
