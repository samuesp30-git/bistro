"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    try {
      await fetch("/api/admin/session", { method: "DELETE" });
    } catch {
      // Even if that failed, send them to sign-in. A stale cookie is checked
      // against the API on the next request anyway.
    }
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={busy}
      className="min-h-11 border border-ink/20 px-5 text-xs font-semibold uppercase tracking-widest text-ink-soft transition-colors duration-300 hover:border-gold-ink hover:text-gold-ink disabled:opacity-40"
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
