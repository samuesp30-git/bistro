"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.isDatabaseReachable = isDatabaseReachable;
const client_1 = require("@prisma/client");
const env_1 = require("../env");
/**
 * One client for the process. `tsx watch` re-evaluates modules on every save,
 * so without the global cache a long dev session opens a new connection pool
 * per reload and eventually exhausts the database connection limit.
 */
const globalForPrisma = globalThis;
exports.prisma = globalForPrisma.prisma ??
    new client_1.PrismaClient({
        log: env_1.env.LOG_LEVEL === "debug" ? ["query", "warn", "error"] : ["warn", "error"],
    });
if (!env_1.isProduction) {
    globalForPrisma.prisma = exports.prisma;
}
/** Cheap round trip, used by the readiness probe. */
async function isDatabaseReachable() {
    try {
        await exports.prisma.$queryRaw `SELECT 1`;
        return true;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=prisma.js.map