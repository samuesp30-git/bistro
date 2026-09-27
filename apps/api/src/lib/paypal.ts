import { env, requireEnv } from "../env";
import { AppError } from "./AppError";

/**
 * The PayPal REST client. Written against `fetch` rather than
 * `@paypal/paypal-server-sdk` on purpose.
 *
 * The integration needs exactly three calls — a token, create an order, capture
 * an order. The official SDK brings axios plus five @apimatic packages to wrap
 * them, cannot verify a webhook signature (the part that actually needs care),
 * and would grow a deliberately pruned 661MB runtime image. `fetch` is global
 * in Node 18+, so this file adds no dependency at all.
 *
 * Not Stripe: Stripe does not operate in Honduras. The shape is the same one —
 * the payer leaves for a hosted page, comes back, and a signed webhook is the
 * only thing permitted to say the order was paid.
 */

const BASE_URLS = {
  sandbox: "https://api-m.sandbox.paypal.com",
  live: "https://api-m.paypal.com",
} as const;

export function paypalBaseUrl(): string {
  return BASE_URLS[env.PAYPAL_ENV];
}

/**
 * Whether payments can run at all. The API boots without PayPal configured — the
 * menu, the cart and the staff panel do not need it — and only the checkout path
 * refuses. A deploy missing one variable therefore fails loudly at the first
 * payment instead of silently taking orders nobody can pay for.
 */
export function isPayPalConfigured(): boolean {
  return Boolean(
    env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET && env.PAYPAL_WEBHOOK_ID
  );
}

// ---------------------------------------------------------------------------
// Access token, cached.
//
// PayPal's tokens last about nine hours and the endpoint is rate limited, so
// fetching one per request is both slow and a way to get throttled. Cached in
// module scope, which is per process: a second instance simply holds its own.
// ---------------------------------------------------------------------------

interface CachedToken {
  value: string;
  /** Epoch ms. Already includes the safety margin. */
  expiresAt: number;
}

let cachedToken: CachedToken | null = null;

/** Renew this early, so a token never expires mid-flight. */
const TOKEN_EXPIRY_MARGIN_MS = 5 * 60 * 1000;

/** In-flight token request, so a burst of orders makes one call, not twenty. */
let tokenInFlight: Promise<string> | null = null;

async function accessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }
  // Two concurrent requests both finding an expired token must not both go to
  // PayPal. The second awaits the first.
  if (tokenInFlight) return tokenInFlight;

  tokenInFlight = requestToken().finally(() => {
    tokenInFlight = null;
  });
  return tokenInFlight;
}

async function requestToken(): Promise<string> {
  const clientId = requireEnv("PAYPAL_CLIENT_ID", "PayPal payments are enabled");
  const secret = requireEnv(
    "PAYPAL_CLIENT_SECRET",
    "PayPal payments are enabled"
  );

  const credentials = Buffer.from(`${clientId}:${secret}`).toString("base64");

  const response = await fetch(`${paypalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const detail = await safeText(response);
    // Deliberately not AppError: a guest cannot fix our credentials, and the
    // message must not leak which half is wrong.
    throw new Error(
      `PayPal token request failed (${response.status}): ${detail}`
    );
  }

  const body = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!body.access_token) {
    throw new Error("PayPal token response contained no access_token");
  }

  // expires_in is seconds. Missing, assume the shortest plausible life rather
  // than caching a token forever.
  const lifetimeMs = (body.expires_in ?? 600) * 1000;
  cachedToken = {
    value: body.access_token,
    expiresAt: Date.now() + Math.max(lifetimeMs - TOKEN_EXPIRY_MARGIN_MS, 0),
  };

  return body.access_token;
}

/** Only for tests and for the sandbox/live switch flipping under a live process. */
export function clearPayPalTokenCache(): void {
  cachedToken = null;
}

// ---------------------------------------------------------------------------
// Money at the boundary.
// ---------------------------------------------------------------------------

/**
 * Integer minor units to the decimal string PayPal wants: 7400 -> "74.00".
 *
 * Built by string surgery, not `cents / 100`, so no float ever touches an
 * amount. Assumes a two-decimal currency, which every currency this app
 * supports is; a zero-decimal one like JPY would need its own branch, and
 * silently emitting "740.00" for ¥74000 is the kind of bug that only shows up
 * in production in another country.
 */
export function centsToPayPalValue(cents: number, currency: string): string {
  if (!Number.isInteger(cents) || cents < 0) {
    throw new Error(`Amount must be a non-negative integer of minor units: ${cents}`);
  }
  if (currency.toUpperCase() !== "USD") {
    throw new Error(
      `centsToPayPalValue assumes a two-decimal currency; got ${currency}`
    );
  }
  const whole = Math.trunc(cents / 100);
  const fraction = cents % 100;
  return `${whole}.${String(fraction).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Create order.
// ---------------------------------------------------------------------------

export interface CreatePayPalOrderInput {
  /** Our own order id, echoed back on every webhook as reference_id. */
  referenceId: string;
  /** The human order number, BIS-0007. */
  invoiceId: string;
  currency: string;
  totalCents: number;
  description: string;
  returnUrl: string;
  cancelUrl: string;
  /**
   * Idempotency key for PayPal-Request-Id. Derived from our order id, so a
   * retried create cannot produce two PayPal orders for one of ours.
   */
  requestId: string;
}

export interface PayPalOrderResult {
  id: string;
  status: string;
  /** Where the browser has to be sent to approve the payment. */
  approvalUrl: string;
}

export async function createPayPalOrder(
  input: CreatePayPalOrderInput
): Promise<PayPalOrderResult> {
  const value = centsToPayPalValue(input.totalCents, input.currency);

  const payload = {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: input.referenceId,
        // invoice_id must be unique per merchant in live mode; a duplicate is
        // rejected with DUPLICATE_INVOICE_ID. orderNumber is a unique column,
        // so this holds by construction.
        invoice_id: input.invoiceId,
        description: input.description.slice(0, 127),
        amount: {
          currency_code: input.currency.toUpperCase(),
          value,
        },
      },
    ],
    payment_source: {
      paypal: {
        experience_context: {
          return_url: input.returnUrl,
          cancel_url: input.cancelUrl,
          // The payer sees "Pay Now" and the amount, instead of "Continue" and
          // a second confirmation step on our side that we do not have.
          user_action: "PAY_NOW",
          // Delivery addresses are collected by our own form, validated against
          // our own rules, and are what the kitchen prints. Letting PayPal
          // collect a second address would mean two addresses disagreeing.
          shipping_preference: "NO_SHIPPING",
        },
      },
    },
  };

  const response = await fetch(`${paypalBaseUrl()}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": input.requestId,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await safeText(response);
    console.error(`PayPal create order failed (${response.status}): ${detail}`);
    throw AppError.unavailable(
      "Could not start the payment. Please try again in a moment."
    );
  }

  const body = (await response.json()) as {
    id?: string;
    status?: string;
    links?: Array<{ rel?: string; href?: string }>;
  };

  if (!body.id) {
    throw new Error("PayPal create order response contained no id");
  }

  const approvalUrl = findApprovalUrl(body.links);
  if (!approvalUrl) {
    throw new Error(
      `PayPal create order returned no approval link (rels: ${
        body.links?.map((l) => l.rel).join(", ") ?? "none"
      })`
    );
  }

  return { id: body.id, status: body.status ?? "UNKNOWN", approvalUrl };
}

/**
 * The link the payer must be redirected to.
 *
 * The rel is `payer-action` when the order was created WITH a payment_source and
 * `approve` when it was not. We always send one, so it is `payer-action` — but
 * reading both is two lines, and hardcoding the wrong one is a failure that only
 * appears at the first real checkout.
 */
function findApprovalUrl(
  links: Array<{ rel?: string; href?: string }> | undefined
): string | null {
  for (const rel of ["payer-action", "approve"]) {
    const match = links?.find((link) => link.rel === rel);
    if (match?.href) return match.href;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Capture.
// ---------------------------------------------------------------------------

export interface PayPalCaptureResult {
  /** PayPal's order status, "COMPLETED" when the money moved. */
  status: string;
  /** The capture id, which is what a refund is issued against. */
  captureId: string | null;
  /** True when PayPal says this order was already captured. */
  alreadyCaptured: boolean;
}

export async function capturePayPalOrder(
  paypalOrderId: string,
  requestId: string
): Promise<PayPalCaptureResult> {
  const response = await fetch(
    `${paypalBaseUrl()}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${await accessToken()}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": requestId,
      },
      // A capture takes no body, but PayPal wants the Content-Type anyway.
      body: "{}",
    }
  );

  const raw = await safeText(response);

  if (!response.ok) {
    // ORDER_ALREADY_CAPTURED is not an error for us: it means a retry, or a
    // second webhook delivery, arrived after the money had already moved. The
    // desired end state is already true.
    if (raw.includes("ORDER_ALREADY_CAPTURED")) {
      return { status: "COMPLETED", captureId: null, alreadyCaptured: true };
    }
    console.error(`PayPal capture failed (${response.status}): ${raw}`);
    throw new Error(`PayPal capture failed with ${response.status}`);
  }

  const body = JSON.parse(raw) as {
    status?: string;
    purchase_units?: Array<{
      payments?: { captures?: Array<{ id?: string; status?: string }> };
    }>;
  };

  const capture = body.purchase_units?.[0]?.payments?.captures?.[0];

  return {
    status: body.status ?? capture?.status ?? "UNKNOWN",
    captureId: capture?.id ?? null,
    alreadyCaptured: false,
  };
}

/** Reads a body without letting a parse failure mask the status code. */
async function safeText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "<unreadable body>";
  }
}
