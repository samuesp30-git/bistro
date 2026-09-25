import { PrismaClient } from "@prisma/client";
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
