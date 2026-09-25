import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/AppError";
import { signStaffToken } from "../../lib/jwt";
import { currentStaff, requireStaff } from "../../middleware/requireStaff";

export const adminAuthRouter = Router();

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1).max(200),
  password: z.string().min(1).max(200),
});

/**
 * A real bcrypt hash of a random throwaway value, compared against when no such
 * user exists.
 *
 * Without it, an unknown email returns in microseconds while a known one takes as
 * long as bcrypt needs, and that gap is a reliable oracle for which addresses have
 * accounts. Comparing regardless keeps both paths the same shape. Measured on this
 * machine: 233ms either way, at the cost 12 the seed uses.
 *
 * Generated with bcrypt, not hand-written, so the cost factor is genuinely 12 and
 * the compare does the full work rather than bailing out on a malformed string.
 */
const TIMING_DECOY_HASH =
  "$2b$12$mtxnEvmiJQFAKGh2Os6Xi.5fVFMnuDuhp41JK/QsUU1RF0ay20GP2";

/**
 * Brute-force brake on the one endpoint that takes a password.
 *
 * Counted per IP, which is why app.ts sets `trust proxy` in production — without
 * it every request appears to come from the platform's proxy and the whole
 * internet shares one bucket.
 *
 * The store is in-memory, so the count is per instance. On a single free-tier
 * instance that is the whole picture; if this ever runs more than one, the limit
 * multiplies by the instance count and wants a shared store. Ten attempts in
 * fifteen minutes is generous for someone who knows their password and slow going
 * for someone guessing.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  // Successful sign-ins do not count, so a staff member who logs in repeatedly
  // during a shift is never locked out by their own correct password.
  skipSuccessfulRequests: true,
  message: {
    error: "Too many sign-in attempts. Try again in a few minutes.",
    code: "rate_limited",
  },
});

adminAuthRouter.post("/login", loginLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    throw AppError.badRequest("Enter an email address and a password.");
  }

  const { email, password } = parsed.data;

  const staff = await prisma.staffUser.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      passwordHash: true,
    },
  });

  const matches = await bcrypt.compare(
    password,
    staff?.passwordHash ?? TIMING_DECOY_HASH
  );

  // One message for a wrong password, an unknown email and a disabled account.
  // Distinguishing them would tell an attacker which half of the guess was right.
  if (!staff || !staff.isActive || !matches) {
    throw AppError.unauthorized("Those details do not match an account.");
  }

  await prisma.staffUser.update({
    where: { id: staff.id },
    data: { lastLoginAt: new Date() },
  });

  const token = signStaffToken({ sub: staff.id, email: staff.email });

  // No Set-Cookie here. The token goes back in the body and the web app puts it
  // in an httpOnly cookie on its own origin.
  res.setHeader("Cache-Control", "no-store");
  res.json({
    token,
    staff: {
      id: staff.id,
      email: staff.email,
      name: staff.name,
      role: staff.role,
    },
  });
});

adminAuthRouter.get("/me", requireStaff, (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({ staff: currentStaff(req) });
});
