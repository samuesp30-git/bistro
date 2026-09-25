import { PrismaClient, Prisma } from "@prisma/client";
import { env, isProduction } from "../env";

/**
 * One client for the process. `tsx watch` re-evaluates modules on every save,
 * so without the global cache a long dev session opens a new connection pool
 * per reload and eventually exhausts the database connection limit.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.LOG_LEVEL === "debug" ? ["query", "warn", "error"] : ["warn", "error"],
  });

if (!isProduction) {
  globalForPrisma.prisma = prisma;
}

/** Cheap round trip, used by the readiness probe. */
export async function isDatabaseReachable(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

/**
 * Transient connection failures Prisma can raise once the app is already
 * serving. These become 503, not 500: the request is fine and retrying it later
 * may well work, so telling a client "we broke" would be a lie and would page
 * whoever watches the 500 rate about the wrong thing.
 */
const CONNECTION_ERROR_CODES = new Set([
  "P1001", // Can't reach database server
  "P1002", // Server reached but timed out
  "P1008", // Operation timed out
  "P1017", // Server has closed the connection
]);

/**
 * True when the failure is the database being out of reach rather than a bug in
 * a query.
 *
 * `PrismaClientInitializationError` also covers a malformed DATABASE_URL and a
 * missing query engine binary, which _are_ our mistakes. They still belong here:
 * every one of them means this instance cannot serve data, which is what 503
 * says, and the full error is logged server-side either way.
 */
export function isDatabaseUnavailable(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientInitializationError) return true;
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return CONNECTION_ERROR_CODES.has(error.code);
  }
  return false;
}
