import { createVerify, X509Certificate, type KeyObject } from "node:crypto";
import { crc32 } from "node:zlib";
import { requireEnv } from "../env";

/**
 * Webhook signature verification, done locally.
 *
 * PayPal offers two methods. This is the one they call preferred, and it was
 * chosen for three independent reasons:
 *
 *  1. The other method posts the event back to PayPal to be checked, which means
 *     a webhook cannot be verified while PayPal is unreachable — the exact
 *     moment a queue of retries is building up.
 *  2. Postback verification does not work with their webhook simulator at all;
 *     only real events pass. Self-verification works with both, so the handler
 *     is testable without paying for something every time.
 *  3. No round trip per delivery.
 *
 * The signed message is:
 *
 *     transmissionId|transmissionTime|webhookId|crc32OfRawBody
 *
 * signed SHA256-with-RSA, base64, against a certificate whose URL arrives in a
 * header. That last part is the whole security problem, and is handled below.
 */

/**
 * The certificate URL arrives in an attacker-controllable header, so it is
 * checked against this list before it is fetched.
 *
 * Without this check the scheme is worthless: forge any body, sign it with your
 * own private key, and point paypal-cert-url at your own matching certificate.
 * Verification passes and you have just told the kitchen an unpaid order was
 * paid. It is also a blind SSRF into whatever the API can reach.
 *
 * `endsWith(".paypal.com")` is deliberate rather than `includes("paypal.com")`:
 * the latter accepts evil-paypal.com.evil.tld.
 */
const CERT_HOST_SUFFIX = ".paypal.com";
const CERT_HOST_EXACT = "paypal.com";

export interface PayPalWebhookHeaders {
  transmissionId: string | undefined;
  transmissionTime: string | undefined;
  transmissionSig: string | undefined;
  certUrl: string | undefined;
  authAlgo: string | undefined;
}

/** Pulls the five headers out of an Express request's header bag. */
export function readPayPalHeaders(
  headers: Record<string, string | string[] | undefined>
): PayPalWebhookHeaders {
  const one = (name: string): string | undefined => {
    const value = headers[name];
    return Array.isArray(value) ? value[0] : value;
  };
  return {
    // Express lower-cases incoming header names.
    transmissionId: one("paypal-transmission-id"),
    transmissionTime: one("paypal-transmission-time"),
    transmissionSig: one("paypal-transmission-sig"),
    certUrl: one("paypal-cert-url"),
    authAlgo: one("paypal-auth-algo"),
  };
}

export type VerificationResult =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Verifies a delivery. `rawBody` must be the exact bytes received: PayPal's own
 * documentation says "You must use the original raw body to calculate this; do
 * not parse the body to an array/object and then re-stringify it." Key order and
 * whitespace both change the checksum, and `JSON.parse` then `JSON.stringify`
 * changes both.
 */
export async function verifyPayPalWebhook(
  rawBody: Buffer,
  headers: PayPalWebhookHeaders
): Promise<VerificationResult> {
  const { transmissionId, transmissionTime, transmissionSig, certUrl } = headers;

  if (!transmissionId || !transmissionTime || !transmissionSig || !certUrl) {
    return { ok: false, reason: "missing one or more paypal-* headers" };
  }

  // Only algorithm PayPal uses, and pinning it stops a header from choosing a
  // weaker one — the same class of mistake as accepting alg:none in a JWT.
  if (headers.authAlgo && !/^SHA256withRSA$/i.test(headers.authAlgo)) {
    return { ok: false, reason: `unexpected auth algo ${headers.authAlgo}` };
  }

  const certHostCheck = assertPayPalCertUrl(certUrl);
  if (!certHostCheck.ok) return certHostCheck;

  const webhookId = requireEnv(
    "PAYPAL_WEBHOOK_ID",
    "the PayPal webhook signature cannot be verified without it"
  );

  // crc32 over the raw bytes, in decimal. zlib.crc32 is native in Node 20.15+,
  // so this needs no dependency.
  const checksum = crc32(rawBody);
  const message = `${transmissionId}|${transmissionTime}|${webhookId}|${checksum}`;

  let publicKey;
  try {
    publicKey = await fetchCertificatePublicKey(certUrl);
  } catch (error) {
    return {
      ok: false,
      reason: `certificate could not be used: ${(error as Error).message}`,
    };
  }

  let verified = false;
  try {
    verified = createVerify("RSA-SHA256")
      .update(message, "utf8")
      .verify(publicKey, transmissionSig, "base64");
  } catch (error) {
    // A malformed base64 signature throws rather than returning false.
    return { ok: false, reason: `signature unreadable: ${(error as Error).message}` };
  }

  return verified ? { ok: true } : { ok: false, reason: "signature did not match" };
}

function assertPayPalCertUrl(certUrl: string): VerificationResult {
  let url: URL;
  try {
    url = new URL(certUrl);
  } catch {
    return { ok: false, reason: "cert url is not a url" };
  }

  // Plain http would let the certificate be swapped in transit.
  if (url.protocol !== "https:") {
    return { ok: false, reason: `cert url is not https: ${url.protocol}` };
  }

  // Reading `hostname` rather than the raw string matters: it resolves
  // https://api.paypal.com@evil.tld/x to evil.tld, which a string match on the
  // URL would have accepted.
  const host = url.hostname.toLowerCase();
  if (host !== CERT_HOST_EXACT && !host.endsWith(CERT_HOST_SUFFIX)) {
    return { ok: false, reason: `cert url host not PayPal: ${host}` };
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Certificate cache.
//
// PayPal rotates these rarely and recommends caching. Without a cache every
// webhook makes an outbound HTTPS request before it can be trusted, which turns
// a burst of deliveries into a burst of fetches.
// ---------------------------------------------------------------------------

interface CachedKey {
  key: KeyObject;
  expiresAt: number;
}

const certCache = new Map<string, CachedKey>();

/** Long enough to be useful, short enough that a rotation is picked up. */
const CERT_CACHE_TTL_MS = 60 * 60 * 1000;

async function fetchCertificatePublicKey(certUrl: string) {
  const cached = certCache.get(certUrl);
  if (cached && cached.expiresAt > Date.now()) return cached.key;

  const response = await fetch(certUrl, {
    // A hung certificate fetch would hold the webhook request open, and PayPal
    // treats a slow response as a failure and retries — turning one stuck fetch
    // into a retry storm.
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(`fetch returned ${response.status}`);
  }

  const pem = await response.text();
  const certificate = new X509Certificate(pem);

  // An expired certificate means either a rotation we have not picked up or
  // something wrong. Either way it must not be trusted.
  const validTo = Date.parse(certificate.validTo);
  if (Number.isFinite(validTo) && validTo < Date.now()) {
    throw new Error(`certificate expired on ${certificate.validTo}`);
  }

  const key = certificate.publicKey;
  certCache.set(certUrl, { key, expiresAt: Date.now() + CERT_CACHE_TTL_MS });
  return key;
}

/** Only for tests. */
export function clearPayPalCertCache(): void {
  certCache.clear();
}
