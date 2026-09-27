import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import { env, isProduction } from "./env";
import { healthRouter } from "./routes/health";
import { apiRouter } from "./routes";
import { paypalWebhookRouter } from "./routes/webhooks/paypal";
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
  // The PayPal webhook is mounted HERE, above express.json(). This line's
  // position is the load-bearing part of this file.
  //
  // Verification hashes the exact bytes PayPal signed — their own documentation
  // says "You must use the original raw body… do not parse the body to an
  // array/object and then re-stringify it", because JSON.parse followed by
  // JSON.stringify changes key order and whitespace and therefore the checksum.
  // Once express.json() has run those bytes are gone and every webhook rejects,
  // with nothing in the request to suggest why.
  //
  // The router carries its own express.raw(), so the rest of the API stays on
  // parsed JSON. Do not "tidy" this by moving it below.
  // ---------------------------------------------------------------------------
  app.use(paypalWebhookRouter);

  app.use(express.json({ limit: "100kb" }));

  app.use(healthRouter);
  app.use("/api", apiRouter);

  // No path argument, so this is Express 5 safe. A bare "*" is a path-to-regexp
  // v8 syntax error in Express 5, which is what most examples still use.
  app.use(notFoundHandler);

  app.use(errorHandler);

  return app;
}
