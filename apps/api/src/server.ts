import { createApp } from "./app";
import { env } from "./env";
import { prisma } from "./lib/prisma";

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`[api] listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

/**
 * Containers are stopped with SIGTERM. Without this the process is killed
 * mid-request and the connection pool is never released, which shows up as
 * lingering database sessions after every deploy.
 */
async function shutdown(signal: string): Promise<void> {
  console.log(`[api] ${signal} received, shutting down`);

  server.close(async (err) => {
    if (err) {
      console.error("[api] error closing server:", err);
    }
    await prisma.$disconnect();
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
