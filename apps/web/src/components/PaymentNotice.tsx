"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { OrderStatusValue } from "@bistro/shared";
import { CheckIcon } from "@/components/icons";

/** What the query string says happened at PayPal, if it says anything. */
export type PaymentOutcome = "return" | "cancelled" | null;

/**
 * What this page says about money.
 *
 * The interesting case is the race, and it is not rare: PayPal sends the payer
 * back to this page and delivers the webhook to the API independently, so the
 * guest can easily arrive before the order has been marked paid. Showing
 * "awaiting payment" to someone who has just paid is the kind of thing that
 * produces a phone call, so when we know they came back from PayPal and the order
 * has not caught up yet, the page waits for it — `router.refresh()`, the same
 * mechanism the kitchen feed uses.
 *
 * It gives up after a while rather than polling forever, and says so.
 */
const POLL_SECONDS = 2;
const GIVE_UP_AFTER_SECONDS = 45;

export default function PaymentNotice({
  status,
  outcome,
}: {
  status: OrderStatusValue;
  outcome: PaymentOutcome;
}) {
  const router = useRouter();
  const waitingForWebhook = outcome === "return" && status === "PENDING_PAYMENT";
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    if (!waitingForWebhook || gaveUp) return;

    const startedAt = Date.now();
    const id = setInterval(() => {
      if (Date.now() - startedAt > GIVE_UP_AFTER_SECONDS * 1000) {
        setGaveUp(true);
        return;
      }
      // A background tab does not need to poll, and a phone that has been in a
      // pocket for ten minutes should not wake up and fire a burst of requests.
      if (document.visibilityState === "visible") router.refresh();
    }, POLL_SECONDS * 1000);

    return () => clearInterval(id);
  }, [waitingForWebhook, gaveUp, router]);

  // aria-live, because for a guest waiting on a confirmation the text changing
  // under them is the entire message, and a screen reader would otherwise never
  // announce it.
  const shell = "mt-6 flex items-start gap-4 border px-6 py-5";

  if (status === "PAID" || status === "IN_KITCHEN" || status === "READY" || status === "COMPLETED") {
    if (status === "PAID") {
      return (
        <div className={`${shell} border-gold-ink/25 bg-gold/10`} aria-live="polite">
          <CheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-gold-ink" />
          <div>
            <p className="font-semibold text-ink">Paid in full.</p>
            <p className="mt-1 max-w-prose text-sm text-ink-soft">
              PayPal has confirmed the payment. Nothing else is owed.
            </p>
          </div>
        </div>
      );
    }
    // Already cooking. Whether it was paid up front is shown by the status list
    // above; repeating it here would just be noise on a ticket in progress.
    return null;
  }

  if (status === "REFUNDED") {
    return (
      <div className={`${shell} border-ink/15 bg-cream-dark`} aria-live="polite">
        <div>
          <p className="font-semibold text-ink">Refunded.</p>
          <p className="mt-1 max-w-prose text-sm text-ink-soft">
            The money has gone back to the account it came from. It can take a few
            days to appear.
          </p>
        </div>
      </div>
    );
  }

  if (status === "PAYMENT_FAILED") {
    return (
      <div className={`${shell} border-ink/15 bg-cream-dark`} aria-live="polite">
        <div>
          <p className="font-semibold text-ink">The payment did not go through.</p>
          <p className="mt-1 max-w-prose text-sm text-ink-soft">
            Your order is still here — nothing was lost. You can pay when you
            collect it, or call us and we will sort it out.
          </p>
        </div>
      </div>
    );
  }

  if (waitingForWebhook && !gaveUp) {
    return (
      <div className={`${shell} border-ink/15 bg-cream-dark`} aria-live="polite">
        <div>
          <p className="font-semibold text-ink">Confirming your payment…</p>
          <p className="mt-1 max-w-prose text-sm text-ink-soft">
            PayPal is letting us know. This page updates itself — there is no need
            to reload it.
          </p>
        </div>
      </div>
    );
  }

  if (waitingForWebhook && gaveUp) {
    return (
      <div className={`${shell} border-ink/15 bg-cream-dark`} aria-live="polite">
        <div>
          <p className="font-semibold text-ink">
            Still waiting on the payment confirmation.
          </p>
          <p className="mt-1 max-w-prose text-sm text-ink-soft">
            The order is placed and the kitchen has it either way. If PayPal took
            the money it will show here shortly; if it did not, you can pay when
            you collect.
          </p>
        </div>
      </div>
    );
  }

  if (outcome === "cancelled") {
    return (
      <div className={`${shell} border-ink/15 bg-cream-dark`} aria-live="polite">
        <div>
          <p className="font-semibold text-ink">Payment cancelled.</p>
          <p className="mt-1 max-w-prose text-sm text-ink-soft">
            The order is still placed — cancelling at PayPal does not cancel the
            food. Pay when you collect it, or call us to cancel properly.
          </p>
        </div>
      </div>
    );
  }

  // PENDING_PAYMENT, arrived here without going to PayPal: either payment is not
  // configured, or the guest closed the tab before paying.
  return (
    <div className={`${shell} border-ink/15 bg-cream-dark`} aria-live="polite">
      <div>
        <p className="font-semibold text-ink">Payable on collection.</p>
        <p className="mt-1 max-w-prose text-sm text-ink-soft">
          Nothing has been charged. You can settle up when you pick the order up
          or when it arrives.
        </p>
      </div>
    </div>
  );
}
