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
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  // Render injects PORT and it is not 4000. Never hardcode the port.
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: z.string().min(1, "DIRECT_URL is required (migrations)"),

  /** Origin allowed by CORS. The web client is the only caller. */
  WEB_ORIGIN: z.string().url().default("http://localhost:3000"),
  /** Base URL Stripe redirects back to after checkout. */
  PUBLIC_WEB_URL: z.string().url().default("http://localhost:3000"),

  // Optional until the phase that introduces them, then required. The modules
  // that consume these assert on them, so a half-configured deploy fails at
  // boot rather than at the first login or the first payment.
  JWT_SECRET: z.string().min(32).optional(),
  JWT_EXPIRES_IN: z.string().min(1).default("12h"),
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
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
