"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Posts to this app's own session route, never to the API.
 *
 * That handler is what exchanges the password for a token and puts it in an
 * httpOnly cookie, so the token never exists in client JavaScript.
 */
export default function AdminLoginForm({
  nextPath,
  expired,
}: {
  nextPath?: string | undefined;
  expired: boolean;
}) {
  const router = useRouter();
  const emailId = useId();
  const passwordId = useId();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? ""),
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(body?.error ?? "That did not work. Please try again.");
        setSubmitting(false);
        return;
      }

      /*
        A safe internal path only. Taking `next` straight from the query string
        would let a crafted link bounce a signed-in staff member to another site,
        carrying the trust of having just logged in. Anything that is not a plain
        /admin path is ignored.
      */
      const destination =
        nextPath && /^\/admin(?:\/|$)/.test(nextPath) ? nextPath : "/admin";

      // refresh() so the server components re-run now that the cookie is set.
      router.replace(destination);
      router.refresh();
    } catch {
      setError("We cannot reach the server. Try again shortly.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-10">
      {expired && (
        <p
          role="status"
          className="mb-6 border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-on-dark-soft"
        >
          That session has ended. Please sign in again.
        </p>
      )}

      <label
        htmlFor={emailId}
        className="block text-xs font-semibold uppercase tracking-widest text-on-dark-soft"
      >
        Email
      </label>
      <input
        id={emailId}
        name="email"
        type="email"
        autoComplete="username"
        required
        autoFocus
        className="mt-2 min-h-11 w-full border border-cream/20 bg-charcoal px-4 text-sm text-cream transition-colors duration-300 placeholder:text-on-dark-muted focus:border-gold"
      />

      <label
        htmlFor={passwordId}
        className="mt-6 block text-xs font-semibold uppercase tracking-widest text-on-dark-soft"
      >
        Password
      </label>
      <input
        id={passwordId}
        name="password"
        type="password"
        autoComplete="current-password"
        required
        className="mt-2 min-h-11 w-full border border-cream/20 bg-charcoal px-4 text-sm text-cream transition-colors duration-300 focus:border-gold"
      />

      {error && (
        <p
          role="alert"
          className="mt-6 border border-terracotta/40 bg-terracotta/10 px-4 py-3 text-sm text-cream"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        /*
          The disabled state switches the text to cream, not just the ground.
          Keeping charcoal text on gold/40 measured 2.30:1 — the "Signing in…"
          message would have been unreadable at the exact moment someone is
          looking for it. Cream on the same ground is 6.75:1.
        */
        className="mt-8 flex min-h-12 w-full items-center justify-center bg-gold px-6 text-sm font-semibold text-charcoal transition-colors duration-300 hover:bg-gold-light disabled:cursor-not-allowed disabled:bg-gold/40 disabled:text-cream"
      >
        {submitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
