import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/AppError";

export const adminDishesRouter = Router();

const adminDishSelect = Prisma.validator<Prisma.DishSelect>()({
  id: true,
  slug: true,
  name: true,
  description: true,
  priceCents: true,
  imageUrl: true,
  isFeatured: true,
  isAvailable: true,
  isArchived: true,
  position: true,
  updatedAt: true,
  category: { select: { slug: true, name: true } },
});

/**
 * Everything the panel needs, including what the public menu hides.
 *
 * Archived dishes are listed too: the panel is where someone would go to bring one
 * back, and a soft delete you cannot see is a soft delete you cannot undo.
 */
adminDishesRouter.get("/dishes", async (_req, res) => {
  const dishes = await prisma.dish.findMany({
    select: adminDishSelect,
    orderBy: [{ position: "asc" }, { name: "asc" }],
  });

  res.setHeader("Cache-Control", "no-store");
  res.json({ dishes });
});

/**
 * Field-by-field, all optional, because the panel sends only what changed.
 *
 * priceCents is an integer of minor units with a ceiling. The ceiling is not
 * fussiness: a mistyped price is the most likely bad edit here, and one that slips
 * through is charged to a real guest.
 */
const updateDishSchema = z
  .object({
    priceCents: z.number().int().min(0).max(1_000_000).optional(),
    isAvailable: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    isArchived: z.boolean().optional(),
    name: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().min(1).max(600).optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: "Nothing to change.",
  });

adminDishesRouter.patch("/dishes/:id", async (req, res) => {
  const parsed = updateDishSchema.safeParse(req.body);
  if (!parsed.success) {
    throw AppError.badRequest("That change is not valid.", {
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  const { id } = req.params;

  try {
    const dish = await prisma.dish.update({
      where: { id },
      data: parsed.data,
      select: adminDishSelect,
    });

    res.setHeader("Cache-Control", "no-store");
    res.json({ dish });
  } catch (error) {
    // P2025 is "record not found". Translating it here keeps a missing id a clean
    // 404 rather than an unhandled 500.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw AppError.notFound("That dish does not exist.");
    }
    throw error;
  }
});
