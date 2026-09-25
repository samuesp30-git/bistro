"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  galleryCategories,
  galleryImages,
  type GalleryCategory,
} from "@/data/restaurant";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
} from "@/components/icons";

type Filter = GalleryCategory | "All";

const filters: Filter[] = ["All", ...galleryCategories];

export default function GalleryGrid() {
  const [filter, setFilter] = useState<Filter>("All");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const shown =
    filter === "All"
      ? galleryImages
      : galleryImages.filter((image) => image.category === filter);

  const count = shown.length;
  const isOpen = openIndex !== null;
  const current = openIndex === null ? null : shown[openIndex];

  const close = useCallback(() => setOpenIndex(null), []);

  const step = useCallback(
    (offset: number) =>
      setOpenIndex((index) =>
        index === null ? null : (index + offset + count) % count
      ),
    [count]
  );

  const open = (index: number, trigger: HTMLElement) => {
    openerRef.current = trigger;
    setOpenIndex(index);
  };

  // Changing the filter would renumber the set the lightbox is indexing into.
  const changeFilter = (next: Filter) => {
    setOpenIndex(null);
    setFilter(next);
  };

  // Keyboard: escape closes, arrows walk the set, tab stays inside the dialog.
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        return;
      }
      if (event.key === "ArrowLeft") {
        step(-1);
        return;
      }
      if (event.key === "ArrowRight") {
        step(1);
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        "button, [href]"
      );
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, close, step]);

  // Hold the page still behind the overlay without letting the layout jump as
  // the scrollbar goes away.
  useEffect(() => {
    if (!isOpen) return;
    const { body, documentElement } = document;
    const gutter = window.innerWidth - documentElement.clientWidth;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;

    body.style.overflow = "hidden";
    if (gutter > 0) body.style.paddingRight = `${gutter}px`;

    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
    };
  }, [isOpen]);

  // Focus lands on the dialog when it opens and goes back where it came from.
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
      return;
    }
    openerRef.current?.focus();
    openerRef.current = null;
  }, [isOpen]);

  return (
    <>
      <div
        role="group"
        aria-label="Filter the gallery"
        className="mb-10 flex flex-wrap justify-center gap-3"
      >
        {filters.map((option) => {
          const selected = filter === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => changeFilter(option)}
              aria-pressed={selected}
              className={`flex min-h-11 items-center rounded-full px-5 text-sm transition-colors duration-300 ${
                selected
                  ? "bg-gold font-semibold text-charcoal"
                  : "border border-ink/15 text-ink-soft hover:border-gold-ink hover:text-ink"
              }`}
            >
              {option === "All" ? "Everything" : option}
            </button>
          );
        })}
      </div>

      <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
        {shown.map((image, index) => (
          <button
            key={image.id}
            type="button"
            onClick={(event) => open(index, event.currentTarget)}
            className="group mb-4 block w-full break-inside-avoid overflow-hidden"
            aria-label={`Open larger: ${image.alt}`}
          >
            <span className="relative block overflow-hidden">
              <Image
                src={image.src}
                alt={image.alt}
                width={image.width}
                height={image.height}
                sizes="(min-width: 1024px) 31vw, (min-width: 640px) 46vw, 92vw"
                className="h-auto w-full object-cover"
              />
              <span
                aria-hidden="true"
                className="absolute inset-0 bg-charcoal/0 transition-colors duration-500 group-hover:bg-charcoal/15"
              />
            </span>
          </button>
        ))}
      </div>

      {openIndex !== null && current && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="Gallery image"
          className="on-charcoal fixed inset-0 z-50 flex items-center justify-center bg-charcoal/95 p-4"
          onClick={close}
        >
          <button
            ref={closeButtonRef}
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center text-cream/70 transition-colors duration-300 hover:text-cream"
          >
            <CloseIcon className="h-6 w-6" />
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              step(-1);
            }}
            aria-label="Previous image"
            className="absolute left-2 flex h-11 w-11 items-center justify-center text-cream/70 transition-colors duration-300 hover:text-cream sm:left-4"
          >
            <ChevronLeftIcon className="h-7 w-7" />
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              step(1);
            }}
            aria-label="Next image"
            className="absolute right-2 flex h-11 w-11 items-center justify-center text-cream/70 transition-colors duration-300 hover:text-cream sm:right-4"
          >
            <ChevronRightIcon className="h-7 w-7" />
          </button>

          <figure
            className="relative max-h-[85svh] w-full max-w-4xl"
            onClick={(event) => event.stopPropagation()}
          >
            <Image
              key={current.id}
              src={current.src}
              alt={current.alt}
              width={current.width}
              height={current.height}
              sizes="(min-width: 1024px) 60vw, 92vw"
              className="max-h-[85svh] w-full object-contain"
            />
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-charcoal/90 to-transparent p-4">
              <p className="text-sm text-cream">{current.alt}</p>
              <p className="tnum mt-1 text-xs text-on-dark-muted">
                {openIndex + 1} of {count}
              </p>
            </figcaption>
          </figure>
        </div>
      )}
    </>
  );
}
