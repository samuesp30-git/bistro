"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  /** Seconds of stagger when several siblings reveal as one group. */
  delay?: number;
  className?: string;
}

/**
 * Reveals a group on first scroll into view.
 *
 * The server renders the content plain and visible; the hidden state is only
 * ever applied from the client, and only to elements that start below the fold.
 * So there is no flash on arrival, nothing to see under reduced motion, and
 * nothing left invisible if the script never runs.
 */
export default function Reveal({
  children,
  delay = 0,
  className = "",
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Already on screen when the page arrived: leave it alone.
    if (el.getBoundingClientRect().top < window.innerHeight) return;

    el.style.transitionDelay = delay ? `${delay}s` : "";
    el.classList.add("reveal");

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          el.classList.add("reveal-in");
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
