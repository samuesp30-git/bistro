import { Router } from "express";
import { menuRouter } from "./menu";
import { ordersRouter } from "./orders";
import { adminRouter } from "./admin";

/**
 * Everything under `/api`. Mounted once in app.ts, so a new feature adds a
 * `use` line here and nothing in the app wiring.
 *
 * The Stripe webhook does NOT belong in this router. It needs the raw request
 * body and therefore has to be mounted above `express.json()`; see the marked
 * block in app.ts.
 */
export const apiRouter = Router();

apiRouter.use(menuRouter);
apiRouter.use(ordersRouter);
apiRouter.use("/admin", adminRouter);
