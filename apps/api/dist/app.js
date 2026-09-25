"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const env_1 = require("./env");
const health_1 = require("./routes/health");
const errorHandler_1 = require("./middleware/errorHandler");
/**
 * Builds the app. Kept separate from listening so a test can mount it without
 * binding a port.
 *
 * The order below is load-bearing in one specific place, marked inline.
 *
 * Handlers do NOT need an asyncHandler wrapper. Verified against express 5.2.1:
 * a throw and a rejected promise inside an async handler both reach the error
 * middleware, and neither crashes the process. Express 4 did crash, which is why
 * most examples still wrap every route; do not add that back here.
 */
function createApp() {
    const app = (0, express_1.default)();
    // Render and most platforms terminate TLS upstream. Without this, req.ip is
    // the proxy for every request, so a rate limiter would bucket the whole
    // internet together.
    if (env_1.isProduction) {
        app.set("trust proxy", 1);
    }
    app.disable("x-powered-by");
    app.use((0, helmet_1.default)({
        // This API serves JSON to a separate origin, never HTML, so the CSP that
        // helmet installs by default protects nothing and only confuses errors.
        contentSecurityPolicy: false,
        crossOriginResourcePolicy: { policy: "cross-origin" },
    }));
    app.use((0, cors_1.default)({
        origin: env_1.env.WEB_ORIGIN,
        // No cookies cross this boundary. The web app holds the session cookie on
        // its own origin and calls this API with an Authorization header, so
        // credentials are deliberately off.
        credentials: false,
        methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    }));
    // ---------------------------------------------------------------------------
    // The Stripe webhook route goes HERE, above express.json().
    //
    // Signature verification needs the exact bytes Stripe signed. Once
    // express.json() has parsed the body those bytes are gone and every webhook
    // fails with "No signatures found matching the expected signature". Mounting
    // express.raw() on that one route, before the global parser, keeps the rest of
    // the API on parsed JSON. Do not "tidy" this by moving it down.
    // ---------------------------------------------------------------------------
    app.use(express_1.default.json({ limit: "100kb" }));
    app.use(health_1.healthRouter);
    // No path argument, so this is Express 5 safe. A bare "*" is a path-to-regexp
    // v8 syntax error in Express 5, which is what most examples still use.
    app.use(errorHandler_1.notFoundHandler);
    app.use(errorHandler_1.errorHandler);
    return app;
}
//# sourceMappingURL=app.js.map