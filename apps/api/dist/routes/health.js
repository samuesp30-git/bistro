"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
exports.healthRouter = (0, express_1.Router)();
/**
 * Liveness. Answers as long as the process is serving, and never depends on the
 * database: a container that restarts every time Postgres blips is worse than
 * one that stays up and reports the problem. This is the path the platform
 * health check and the compose healthcheck point at.
 */
exports.healthRouter.get("/health", (_req, res) => {
    res.json({
        status: "ok",
        uptimeSeconds: Math.round(process.uptime()),
    });
});
/**
 * Readiness. Says whether this instance can actually serve a request that needs
 * data, so a cold Neon branch or a bad DATABASE_URL is visible as 503 rather
 * than as a pile of failing endpoints.
 */
exports.healthRouter.get("/health/ready", async (_req, res) => {
    const database = await (0, prisma_1.isDatabaseReachable)();
    res.status(database ? 200 : 503).json({
        status: database ? "ready" : "degraded",
        database,
    });
});
//# sourceMappingURL=health.js.map