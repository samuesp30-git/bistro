"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const env_1 = require("./env");
const prisma_1 = require("./lib/prisma");
const app = (0, app_1.createApp)();
const server = app.listen(env_1.env.PORT, () => {
    console.log(`[api] listening on http://localhost:${env_1.env.PORT} (${env_1.env.NODE_ENV})`);
});
/**
 * Containers are stopped with SIGTERM. Without this the process is killed
 * mid-request and the connection pool is never released, which shows up as
 * lingering database sessions after every deploy.
 */
async function shutdown(signal) {
    console.log(`[api] ${signal} received, shutting down`);
    server.close(async (err) => {
        if (err) {
            console.error("[api] error closing server:", err);
        }
        await prisma_1.prisma.$disconnect();
        process.exit(err ? 1 : 0);
    });
    // Do not hang forever on a stuck connection.
    setTimeout(() => {
        console.error("[api] shutdown timed out, forcing exit");
        process.exit(1);
    }, 10_000).unref();
}
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
//# sourceMappingURL=server.js.map