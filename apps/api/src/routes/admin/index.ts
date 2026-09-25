import { Router } from "express";
import { requireStaff } from "../../middleware/requireStaff";
import { adminAuthRouter } from "./auth";
import { adminDishesRouter } from "./dishes";

/**
 * Everything under /api/admin.
 *
 * The gate is applied here, once, to everything that comes after the auth router,
 * rather than being remembered on each route. A new admin route is protected
 * because of where it is mounted, not because someone thought to add a middleware
 * to it — which is the failure mode that leaves one endpoint wide open.
 */
export const adminRouter = Router();

// /login must stay reachable without a token, and /me carries its own gate.
adminRouter.use(adminAuthRouter);

adminRouter.use(requireStaff);
adminRouter.use(adminDishesRouter);
