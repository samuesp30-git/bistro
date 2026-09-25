"use client";

import { useEffect, useState } from "react";
import { restaurantInfo, telHref, whatsappLink } from "@/data/restaurant";
import { CheckIcon, WhatsAppIcon } from "@/components/icons";

type FormState = "idle" | "sent" | "blocked";

const emptyForm = {
  name: "",
  phone: "",
  guests: "2",
  date: "",
  time: "",
  message: "",
};

const fieldClass =
  "w-full min-h-12 px-4 py-3 bg-cream-dark/60 border border-ink/15 text-ink text-sm placeholder:text-ink-muted transition-colors duration-300 focus:border-gold-ink focus:outline-none focus:ring-1 focus:ring-gold-ink/40";

const labelClass = "mb-1.5 block text-sm text-ink-soft";

export default function ContactForm() {
  const [form, setForm] = useState(emptyForm);
  const [state, setState] = useState<FormState>("idle");
  const [link, setLink] = useState("");
  const [minDate, setMinDate] = useState("");

  // Set on the client, so a page built last week cannot offer a past date.
  useEffect(() => {
    const today = new Date();
    const offset = today.getTimezoneOffset() * 60_000;
    setMinDate(new Date(today.getTime() - offset).toISOString().slice(0, 10));
  }, []);

  const update = <K extends keyof typeof emptyForm>(
    key: K,
    value: string
  ) => setForm((previous) => ({ ...previous, [key]: value }));

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const lines = [
      `Hi! I would like to request a table at ${restaurantInfo.name}.`,
      "",
      `Name: ${form.name}`,
      `Party size: ${form.guests}`,
    ];
    if (form.date) lines.push(`Date: ${form.date}`);
    if (form.time) lines.push(`Time: ${form.time}`);
    if (form.phone) lines.push(`Phone: ${form.phone}`);
    if (form.message) lines.push(`Notes: ${form.message}`);

    const url = whatsappLink(lines.join("\n"));
    setLink(url);

    // A blocked popup returns null without throwing, so the only honest way to
    // claim WhatsApp opened is to check that it did.
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    setState(opened ? "sent" : "blocked");
  };

  const reset = () => {
    setForm(emptyForm);
    setLink("");
    setState("idle");
  };

  if (state === "sent") {
    return (
      <div className="border border-ink/10 px-6 py-14 text-center">
        <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-whatsapp/15 text-whatsapp-dark">
          <CheckIcon className="h-7 w-7" />
        </span>
        <h3 className="font-display text-2xl font-semibold text-ink">
          WhatsApp is open with your details
        </h3>
        <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">
          Send the message to reach the restaurant. Your table is booked once
          someone replies to confirm it.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-8 inline-flex min-h-11 items-center border border-ink/20 px-6 text-sm font-semibold text-ink transition-colors duration-300 hover:border-gold-ink hover:text-gold-ink"
        >
          Request another table
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="res-name" className={labelClass}>
          Name (required)
        </label>
        <input
          id="res-name"
          name="name"
          type="text"
          required
          autoComplete="name"
          value={form.name}
          onChange={(event) => update("name", event.target.value)}
          className={fieldClass}
          placeholder="Your full name"
        />
      </div>

      <div>
        <label htmlFor="res-phone" className={labelClass}>
          Phone
        </label>
        <input
          id="res-phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          value={form.phone}
          onChange={(event) => update("phone", event.target.value)}
          className={fieldClass}
          placeholder="So we can reach you"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="res-guests" className={labelClass}>
            Party size (required)
          </label>
          <select
            id="res-guests"
            name="guests"
            required
            value={form.guests}
            onChange={(event) => update("guests", event.target.value)}
            className={fieldClass}
          >
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={String(n)}>
                {n === 1 ? "1 guest" : `${n} guests`}
              </option>
            ))}
            <option value="8 or more">8 or more</option>
          </select>
        </div>

        <div>
          <label htmlFor="res-date" className={labelClass}>
            Date
          </label>
          <input
            id="res-date"
            name="date"
            type="date"
            min={minDate || undefined}
            value={form.date}
            onChange={(event) => update("date", event.target.value)}
            className={fieldClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="res-time" className={labelClass}>
          Preferred time
        </label>
        <input
          id="res-time"
          name="time"
          type="time"
          value={form.time}
          onChange={(event) => update("time", event.target.value)}
          className={fieldClass}
        />
      </div>

      <div>
        <label htmlFor="res-notes" className={labelClass}>
          Anything we should know
        </label>
        <textarea
          id="res-notes"
          name="message"
          rows={3}
          value={form.message}
          onChange={(event) => update("message", event.target.value)}
          className={fieldClass}
          placeholder="Allergies, the occasion, where you would like to sit"
        />
      </div>

      {state === "blocked" && (
        <div
          role="alert"
          className="border border-terracotta-ink/30 bg-terracotta/5 p-4 text-sm text-terracotta-ink"
        >
          <p>
            Your browser blocked the WhatsApp window. Open it directly, or call{" "}
            <a
              href={telHref}
              className="font-semibold underline"
            >
              {restaurantInfo.phone}
            </a>
            .
          </p>
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex min-h-11 items-center font-semibold underline"
          >
            Open WhatsApp with these details
          </a>
        </div>
      )}

      <button
        type="submit"
        className="flex min-h-12 w-full items-center justify-center gap-3 rounded-sm bg-whatsapp px-6 text-sm font-semibold text-charcoal transition-colors duration-300 hover:bg-whatsapp-dark"
      >
        <WhatsAppIcon className="h-5 w-5" />
        Send request on WhatsApp
      </button>

      <p className="text-center text-xs text-ink-muted">
        This opens WhatsApp with your details written out. Nothing is booked
        until the restaurant replies.
      </p>
    </form>
  );
}
