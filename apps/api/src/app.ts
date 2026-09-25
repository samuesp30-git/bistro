import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import { env, isProduction } from "./env";
import { healthRouter } from "./routes/health";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

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
export function createApp(): Express {
  const app = express();

  // Render and most platforms terminate TLS upstream. Without this, req.ip is
  // the proxy for every request, so a rate limiter would bucket the whole
  // internet together.
  if (isProduction) {
    app.set("trust proxy", 1);
  }

  app.disable("x-powered-by");

  app.use(
    helmet({
      // This API serves JSON to a separate origin, never HTML, so the CSP that
      // helmet installs by default protects nothing and only confuses errors.
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );

  app.use(
    cors({
      origin: env.WEB_ORIGIN,
      // No cookies cross this boundary. The web app holds the session cookie on
      // its own origin and calls this API with an Authorization header, so
      // credentials are deliberately off.
      credentials: false,
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    })
  );

  // ---------------------------------------------------------------------------
  // The Stripe webhook route goes HERE, above express.json().
  //
  // Signature verification needs the exact bytes Stripe signed. Once
  // express.json() has parsed the body those bytes are gone and every webhook
  // fails with "No signatures found matching the expected signature". Mounting
  // express.raw() on that one route, before the global parser, keeps the rest of
  // the API on parsed JSON. Do not "tidy" this by moving it down.
  // ---------------------------------------------------------------------------

  app.use(express.json({ limit: "100kb" }));

  app.use(healthRouter);

  // No path argument, so this is Express 5 safe. A bare "*" is a path-to-regexp
  // v8 syntax error in Express 5, which is what most examples still use.
  app.use(notFoundHandler);

  app.use(errorHandler);

  return app;
}
