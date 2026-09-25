"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Re-runs the page's server components on an interval, so new orders appear.
 *
 * `router.refresh()` rather than a client fetch on purpose: the feed stays a server
 * component, which means the session token is never handed to the browser and there
 * is no admin endpoint exposed on this origin for a poll to call. React reconciles
 * the new tree, so a ticket someone is reading does not flicker or lose scroll.
 *
 * It pauses while the tab is hidden. A kitchen tablet left on all evening would
 * otherwise spend the night refreshing a page nobody is looking at.
 */
export default function AutoRefresh({
  seconds = 5,
}: {
  seconds?: number;
}) {
  const router = useRouter();
  const [live, setLive] = useState(true);

  useEffect(() => {
    if (!live) return;

    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };

    const id = setInterval(tick, seconds * 1000);

    // Coming back to the tab should show the current queue immediately, not after
    // waiting out the rest of the interval.
    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, seconds, live]);

  return (
    <button
      type="button"
      onClick={() => setLive((on) => !on)}
      aria-pressed={live}
      className="flex min-h-11 items-center gap-2 border border-ink/20 px-4 text-xs font-semibold uppercase tracking-widest text-ink-soft transition-colors duration-300 hover:border-gold-ink hover:text-gold-ink"
    >
      <span
        aria-hidden="true"
        className={`h-2 w-2 rounded-full ${
          live ? "bg-gold-ink" : "bg-ink/30"
        }`}
      />
      {live ? `Live · every ${seconds}s` : "Paused"}
    </button>
  );
}
