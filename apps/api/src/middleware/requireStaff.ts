import type { RequestHandler } from "express";
import { prisma } from "../lib/prisma";
import { AppError } from "../lib/AppError";
import { verifyStaffToken } from "../lib/jwt";

export interface AuthenticatedStaff {
  id: string;
  email: string;
  name: string;
  role: "OWNER" | "STAFF";
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      staff?: AuthenticatedStaff;
    }
  }
}

/**
 * Gate for every /api/admin route.
 *
 * Bearer only. No cookie is read here, because this API is called from a server,
 * not from a browser: the session cookie lives on the web app's own origin and
 * the web app attaches the token. That split means there is no cross-site cookie
 * to get wrong and no CORS-with-credentials to configure, and the API stays
 * reachable with curl and a token.
 *
 * The staff member is re-read from the database on every request rather than
 * trusted from the token's claims, so deactivating an account takes effect on the
 * next request instead of whenever their token happens to expire.
 */
export const requireStaff: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.get("authorization");
    if (!header?.startsWith("Bearer ")) {
      throw AppError.unauthorized("Sign in to use the panel.");
    }

    const payload = verifyStaffToken(header.slice("Bearer ".length).trim());

    const staff = await prisma.staffUser.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });

    if (!staff || !staff.isActive) {
      throw AppError.unauthorized("That account is no longer active.");
    }

    req.staff = {
      id: staff.id,
      email: staff.email,
      name: staff.name,
      role: staff.role,
    };
    next();
  } catch (error) {
    next(error);
  }
};

/** Reads the staff member the gate attached, or fails loudly if it was skipped. */
export function currentStaff(req: Express.Request): AuthenticatedStaff {
  if (!req.staff) {
    // A programming error, not a client one: the route was mounted without the
    // gate in front of it.
    throw new Error("currentStaff called on a route without requireStaff");
  }
  return req.staff;
}
