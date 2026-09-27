import express, { Router } from "express";
import {
  readPayPalHeaders,
  verifyPayPalWebhook,
} from "../../lib/paypalSignature";
import { applyPayPalEvent, type PayPalEvent } from "../../services/payments";
import { isPayPalConfigured } from "../../lib/paypal";

/**
 * The PayPal webhook. The only endpoint in this API that reads a raw body.
 *
 * Mounted in app.ts ABOVE express.json(); see the marked block there. This
 * router carries its own `express.raw()` so the dependency travels with the
 * route rather than living as a loose line in the app wiring that somebody
 * tidies away.
 */
export const paypalWebhookRouter = Router();

paypalWebhookRouter.post(
  "/api/webhooks/paypal",
  // `type: "application/json"` and not "*/*": PayPal sends JSON, and a wildcard
  // would swallow every content type for this path, making a misconfigured
  // sender look like a signature failure instead of a wrong content type.
  express.raw({ type: "application/json", limit: "1mb" }),
  async (req, res) => {
    if (!isPayPalConfigured()) {
      // 503 rather than 404. PayPal retries a 5xx, and a webhook arriving at an
      // instance that has not been given its credentials yet is exactly the case
      // where a retry is the right thing.
      res.status(503).json({ error: "Payments are not configured", code: "unavailable" });
      return;
    }

    if (!Buffer.isBuffer(req.body)) {
      // Something parsed the body before this handler, which means the raw bytes
      // are gone and no signature can ever verify. Worth failing clearly: the
      // symptom otherwise is every webhook rejecting for no visible reason.
      console.error(
        "PayPal webhook did not receive a raw Buffer. Check the middleware order in app.ts."
      );
      res.status(500).json({ error: "Misconfigured webhook route", code: "internal_error" });
      return;
    }

    const rawBody: Buffer = req.body;
    const headers = readPayPalHeaders(req.headers);

    const verification = await verifyPayPalWebhook(rawBody, headers);
    if (!verification.ok) {
      // The reason is logged, never returned. Telling a caller why their forgery
      // failed is telling them how to fix it.
      console.warn(`Rejected PayPal webhook: ${verification.reason}`);
      res.status(400).json({ error: "Invalid signature", code: "bad_request" });
      return;
    }

    let event: PayPalEvent;
    try {
      event = JSON.parse(rawBody.toString("utf8")) as PayPalEvent;
    } catch {
      // A verified signature over a body that is not JSON should be impossible,
      // so this is a 400 and not a retry-worthy 500.
      res.status(400).json({ error: "Body was not JSON", code: "bad_request" });
      return;
    }

    const result = await applyPayPalEvent(event, headers.transmissionId);

    // 200 either way, deliberately.
    //
    // "handled: false" covers events we do not act on — a type we never
    // subscribed to, or an order that is not ours. Those will never succeed on a
    // retry, and answering non-2xx would have PayPal redeliver them for days and
    // eventually disable the endpoint. Something that genuinely failed threw
    // instead, and the error handler answers 500, which is what earns a retry.
    console.log(
      `PayPal ${event.event_type ?? "?"} ${event.id ?? "?"}: ${result.note}`
    );
    res.status(200).json({ received: true });
  }
);
