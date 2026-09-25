import jwt from "jsonwebtoken";
import { env, requireEnv } from "../env";
import { AppError } from "./AppError";

/**
 * Staff session tokens.
 *
 * The token is a bearer credential and nothing else: it says who the holder is,
 * and every route re-reads that staff member from the database before trusting
 * anything about them. A role baked into a token would otherwise keep working
 * after the owner demoted or deactivated someone.
 */

export interface StaffTokenPayload {
  /** StaffUser id. */
  sub: string;
  email: string;
}

const ISSUER = "bistro-api";
const AUDIENCE = "bistro-staff";

function secret(): string {
  return requireEnv("JWT_SECRET", "staff sessions are signed with it");
}

export function signStaffToken(payload: StaffTokenPayload): string {
  return jwt.sign({ email: payload.email }, secret(), {
    subject: payload.sub,
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    issuer: ISSUER,
    audience: AUDIENCE,
    algorithm: "HS256",
  });
}

/**
 * Verifies a token, or throws a 401.
 *
 * `algorithms` is pinned. Without it a library that also supports asymmetric
 * algorithms will happily verify a token whose header claims `alg: none` or
 * swaps to a different scheme, which is the classic JWT confusion attack.
 */
export function verifyStaffToken(token: string): StaffTokenPayload {
  try {
    const decoded = jwt.verify(token, secret(), {
      algorithms: ["HS256"],
      issuer: ISSUER,
      audience: AUDIENCE,
    });

    if (
      typeof decoded !== "object" ||
      decoded === null ||
      typeof decoded.sub !== "string" ||
      typeof decoded.email !== "string"
    ) {
      throw AppError.unauthorized("That session is not valid.");
    }

    return { sub: decoded.sub, email: decoded.email };
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error instanceof jwt.TokenExpiredError) {
      throw AppError.unauthorized("That session has expired. Please sign in again.");
    }
    throw AppError.unauthorized("That session is not valid.");
  }
}
