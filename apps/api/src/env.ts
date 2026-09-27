import { config as loadDotenv } from "dotenv";
import { z } from "zod";

loadDotenv();

/**
 * Every environment variable the API reads, validated once at boot.
 *
 * A missing or malformed variable stops the process immediately with a message
 * naming the variable. The alternative is discovering it as `undefined` deep
 * inside a request handler in production, which is how a service ends up
 * signing tokens with the string "undefined".
 */
/**
 * A variable that is optional, where an empty value counts as unset.
 *
 * `z.string().min(1).optional()` does NOT accept "": optional() permits
 * undefined, not empty. That distinction matters because an empty string is
 * exactly what you get from every place these values come from — compose
 * interpolation writes `${PAYPAL_CLIENT_ID:-}` as "", and Render and Vercel both
 * hand over an empty string for a variable somebody created and never filled in.
 * Without this the API would refuse to boot because of a feature nobody enabled.
 */
const optionalSecret = (minLength = 1) =>
  z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(minLength).optional()
  );

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  // Render injects PORT and it is not 4000. Never hardcode the port.
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: z.string().min(1, "DIRECT_URL is required (migrations)"),

  /** Origin allowed by CORS. The web client is the only caller. */
  WEB_ORIGIN: z.string().url().default("http://localhost:3000"),
  /** Base URL PayPal redirects the payer back to after approval. */
  PUBLIC_WEB_URL: z.string().url().default("http://localhost:3000"),

  // Optional until the phase that introduces them, then required. The modules
  // that consume these assert on them, so a half-configured deploy fails at
  // boot rather than at the first login or the first payment.
  JWT_SECRET: optionalSecret(32),
  JWT_EXPIRES_IN: z.string().min(1).default("12h"),

  // ---------------------------------------------------------------------------
  // PayPal.
  //
  // Not Stripe: Stripe does not operate in Honduras, and in Latin America
  // supports only Brazil and Mexico. PayPal does, and the integration shape is
  // the same one — redirect away, come back, and let a signed webhook be the
  // only thing that may declare the order paid.
  // ---------------------------------------------------------------------------
  /** "sandbox" picks api-m.sandbox.paypal.com. Never inferred from NODE_ENV: a
   *  staging deploy runs NODE_ENV=production against the sandbox, and guessing
   *  that wrong means taking real money in a test. */
  PAYPAL_ENV: z.enum(["sandbox", "live"]).default("sandbox"),
  PAYPAL_CLIENT_ID: optionalSecret(),
  PAYPAL_CLIENT_SECRET: optionalSecret(),
  /** The webhook's id from the PayPal dashboard. It is part of the signed
   *  message, so it is required to verify anything — not a secret, but without
   *  it every signature check fails. */
  PAYPAL_WEBHOOK_ID: optionalSecret(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
  throw new Error(`Invalid environment configuration:\n${details}`);
}

export const env = parsed.data;

export const isProduction = env.NODE_ENV === "production";

/**
 * Reads a variable that is optional at boot but mandatory for the feature
 * asking for it, so the failure names both the variable and the reason.
 */
export function requireEnv<K extends keyof typeof env>(
  key: K,
  reason: string
): NonNullable<(typeof env)[K]> {
  const value = env[key];
  if (value === undefined || value === "") {
    throw new Error(`${String(key)} must be set: ${reason}`);
  }
  return value as NonNullable<(typeof env)[K]>;
}
