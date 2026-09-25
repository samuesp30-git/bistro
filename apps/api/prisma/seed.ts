/**
 * Seeds the menu that the marketing site used to hold in a hardcoded array.
 *
 * Every dish, description, price and image below is the same content the static
 * site shipped, so the menu page looks identical after the switch to Postgres.
 *
 * Idempotent: everything upserts on its natural key, so running it twice does
 * not duplicate or delete anything. That matters because Option rows are
 * referenced by order history with onDelete: Restrict — a seed that dropped and
 * recreated them would fail the moment a real order existed.
 */
import {
  PrismaClient,
  SelectionType,
  StaffRole,
  TagKind,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const BCRYPT_COST = 12;

const categories = [
  { slug: "entrees", name: "Entrées", position: 0 },
  { slug: "plats", name: "Plats", position: 1 },
  { slug: "desserts", name: "Desserts", position: 2 },
  { slug: "boissons", name: "Boissons", position: 3 },
];

const tags = [
  { slug: "vegetarian", name: "Vegetarian", kind: TagKind.DIETARY, position: 0 },
  { slug: "gluten-free", name: "Gluten-Free", kind: TagKind.DIETARY, position: 1 },
  { slug: "signature", name: "Signature", kind: TagKind.LABEL, position: 2 },
  { slug: "wine", name: "Wine", kind: TagKind.LABEL, position: 3 },
  { slug: "cocktail", name: "Cocktail", kind: TagKind.LABEL, position: 4 },
];

interface SeedOption {
  name: string;
  priceDeltaCents?: number;
  isDefault?: boolean;
}

interface SeedOptionGroup {
  name: string;
  selectionType: SelectionType;
  minSelect: number;
  maxSelect?: number;
  options: SeedOption[];
}

interface SeedDish {
  slug: string;
  name: string;
  description: string;
  priceCents: number;
  imageUrl: string;
  categorySlug: string;
  tagSlugs: string[];
  isFeatured?: boolean;
  optionGroups?: SeedOptionGroup[];
}

const IMAGE = (id: string) =>
  `https://images.unsplash.com/${id}?w=1000&h=750&fit=crop`;

const dishes: SeedDish[] = [
  {
    slug: "burrata-heirloom-tomato",
    name: "Burrata & Heirloom Tomato",
    description:
      "Creamy burrata cheese over ripe heirloom tomatoes, drizzled with aged balsamic and fresh basil.",
    priceCents: 1800,
    imageUrl: IMAGE("photo-1608897013039-887f21d8c804"),
    categorySlug: "entrees",
    tagSlugs: ["vegetarian", "gluten-free"],
    isFeatured: true,
  },
  {
    slug: "tuna-tartare",
    name: "Tuna Tartare",
    description:
      "Fresh yellowfin tuna with avocado mousse, crispy shallots, and a citrus soy dressing.",
    priceCents: 2200,
    imageUrl: IMAGE("photo-1579871494447-9811cf80d66c"),
    categorySlug: "entrees",
    tagSlugs: ["gluten-free"],
  },
  {
    slug: "french-onion-soup",
    name: "French Onion Soup",
    description:
      "Classic caramelized onion soup with a golden Gruyère crust and crusty sourdough crouton.",
    priceCents: 1400,
    imageUrl: IMAGE("photo-1547592166-23ac45744acd"),
    categorySlug: "entrees",
    tagSlugs: [],
  },
  {
    slug: "pan-seared-salmon",
    name: "Pan-Seared Salmon",
    description:
      "Atlantic salmon with a crispy skin, served on a bed of lemon risotto and asparagus tips.",
    priceCents: 3600,
    imageUrl: IMAGE("photo-1467003909585-2f8a72700288"),
    categorySlug: "plats",
    tagSlugs: ["gluten-free"],
    isFeatured: true,
  },
  {
    slug: "wagyu-ribeye",
    name: "Wagyu Ribeye",
    description:
      "Prime wagyu ribeye, dry-aged 28 days, served with truffle mashed potatoes and roasted bone marrow.",
    priceCents: 6200,
    imageUrl: IMAGE("photo-1546833999-b9f581a1996d"),
    categorySlug: "plats",
    tagSlugs: ["signature"],
    isFeatured: true,
    optionGroups: [
      {
        name: "Doneness",
        selectionType: SelectionType.SINGLE,
        minSelect: 1,
        maxSelect: 1,
        options: [
          { name: "Rare" },
          { name: "Medium rare", isDefault: true },
          { name: "Medium" },
          { name: "Well done" },
        ],
      },
      {
        name: "Add to the plate",
        selectionType: SelectionType.MULTI,
        minSelect: 0,
        maxSelect: 2,
        options: [
          { name: "Extra bone marrow", priceDeltaCents: 1200 },
          { name: "Truffle butter", priceDeltaCents: 800 },
        ],
      },
    ],
  },
  {
    slug: "wild-mushroom-risotto",
    name: "Wild Mushroom Risotto",
    description:
      "Arborio rice slow-cooked with porcini, chanterelle, and shiitake mushrooms, finished with Parmigiano.",
    priceCents: 2800,
    imageUrl: IMAGE("photo-1476124369491-e7addf5db371"),
    categorySlug: "plats",
    tagSlugs: ["vegetarian"],
    optionGroups: [
      // A paid upgrade: one choice is mandatory and one of them costs more.
      {
        name: "Portion",
        selectionType: SelectionType.SINGLE,
        minSelect: 1,
        maxSelect: 1,
        options: [
          { name: "Regular", isDefault: true },
          { name: "Large", priceDeltaCents: 900 },
        ],
      },
      // A free removal: any number, none of them changes the price.
      {
        name: "Leave out",
        selectionType: SelectionType.MULTI,
        minSelect: 0,
        maxSelect: 3,
        options: [
          { name: "No onion" },
          { name: "No garlic" },
          { name: "No parmesan" },
        ],
      },
    ],
  },
  {
    slug: "creme-brulee",
    name: "Crème Brûlée",
    description:
      "Classic Madagascar vanilla bean crème brûlée with a perfectly caramelized sugar crust.",
    priceCents: 1400,
    imageUrl: IMAGE("photo-1470324161839-ce2bb6fa6bc3"),
    categorySlug: "desserts",
    tagSlugs: ["gluten-free"],
  },
  {
    slug: "chocolate-fondant",
    name: "Chocolate Fondant",
    description:
      "Warm dark chocolate lava cake with a molten center, served with vanilla bean ice cream.",
    priceCents: 1600,
    imageUrl: IMAGE("photo-1606313564200-e75d5e30476c"),
    categorySlug: "desserts",
    tagSlugs: [],
  },
  {
    slug: "tarte-tatin",
    name: "Tarte Tatin",
    description:
      "Upside-down apple tart with caramelized Granny Smith apples, puff pastry, and crème fraîche.",
    priceCents: 1500,
    imageUrl: IMAGE("photo-1509440159596-0249088772ff"),
    categorySlug: "desserts",
    tagSlugs: [],
  },
  {
    slug: "sommelier-red-selection",
    name: "Sommelier Red Selection",
    description:
      "A curated glass of red wine chosen by our sommelier to sit alongside your meal.",
    priceCents: 1800,
    imageUrl: IMAGE("photo-1510812431401-41d2bd2722f3"),
    categorySlug: "boissons",
    tagSlugs: ["wine"],
  },
  {
    slug: "lavender-spritz",
    name: "Lavender Spritz",
    description:
      "House-made lavender syrup with prosecco, a splash of soda, and a twist of lemon.",
    priceCents: 1500,
    imageUrl: IMAGE("photo-1536935338788-846bb9981813"),
    categorySlug: "boissons",
    tagSlugs: ["cocktail"],
    optionGroups: [
      {
        name: "Pour",
        selectionType: SelectionType.MULTI,
        minSelect: 0,
        maxSelect: 1,
        options: [{ name: "Make it a double", priceDeltaCents: 600 }],
      },
    ],
  },
  {
    slug: "espresso-martini",
    name: "Espresso Martini",
    description:
      "Freshly pulled espresso shaken with vodka, coffee liqueur, and a touch of vanilla.",
    priceCents: 1700,
    imageUrl: IMAGE("photo-1514362545857-3bc16c4c7d1b"),
    categorySlug: "boissons",
    tagSlugs: ["cocktail"],
  },
];

/**
 * Tax is 0 by default rather than a number invented here. The owner sets the
 * real rate from the admin panel; the column exists so the total is computed
 * server-side either way.
 */
const settings: Record<string, string> = {
  accepting_orders: "true",
  delivery_fee_cents: "499",
  tax_bps: "0",
  min_order_cents: "0",
  pickup_lead_minutes: "30",
};

async function seedCategories() {
  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, position: category.position },
      create: category,
    });
  }
  return categories.length;
}

async function seedTags() {
  for (const tag of tags) {
    await prisma.tag.upsert({
      where: { slug: tag.slug },
      update: { name: tag.name, kind: tag.kind, position: tag.position },
      create: tag,
    });
  }
  return tags.length;
}

async function seedDishes() {
  for (const [index, dish] of dishes.entries()) {
    const category = await prisma.category.findUniqueOrThrow({
      where: { slug: dish.categorySlug },
    });

    const tagConnections = dish.tagSlugs.map((slug) => ({ slug }));

    const record = await prisma.dish.upsert({
      where: { slug: dish.slug },
      update: {
        name: dish.name,
        description: dish.description,
        priceCents: dish.priceCents,
        imageUrl: dish.imageUrl,
        categoryId: category.id,
        isFeatured: dish.isFeatured ?? false,
        position: index,
        // set, not connect: the seed is the source of truth for tags, so a tag
        // removed from the array above is removed from the dish.
        tags: { set: tagConnections },
      },
      create: {
        slug: dish.slug,
        name: dish.name,
        description: dish.description,
        priceCents: dish.priceCents,
        imageUrl: dish.imageUrl,
        categoryId: category.id,
        isFeatured: dish.isFeatured ?? false,
        position: index,
        tags: { connect: tagConnections },
      },
    });

    for (const [groupIndex, group] of (dish.optionGroups ?? []).entries()) {
      const groupRecord = await prisma.optionGroup.upsert({
        where: { dishId_name: { dishId: record.id, name: group.name } },
        update: {
          selectionType: group.selectionType,
          minSelect: group.minSelect,
          maxSelect: group.maxSelect ?? null,
          position: groupIndex,
        },
        create: {
          dishId: record.id,
          name: group.name,
          selectionType: group.selectionType,
          minSelect: group.minSelect,
          maxSelect: group.maxSelect ?? null,
          position: groupIndex,
        },
      });

      for (const [optionIndex, option] of group.options.entries()) {
        await prisma.option.upsert({
          where: {
            optionGroupId_name: {
              optionGroupId: groupRecord.id,
              name: option.name,
            },
          },
          update: {
            priceDeltaCents: option.priceDeltaCents ?? 0,
            isDefault: option.isDefault ?? false,
            position: optionIndex,
          },
          create: {
            optionGroupId: groupRecord.id,
            name: option.name,
            priceDeltaCents: option.priceDeltaCents ?? 0,
            isDefault: option.isDefault ?? false,
            position: optionIndex,
          },
        });
      }
    }
  }
  return dishes.length;
}

async function seedSettings() {
  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.upsert({
      where: { key },
      update: {},
      create: { key, value },
    });
  }
  return Object.keys(settings).length;
}

/**
 * No default password exists in this repository. The seed refuses to run without
 * one, so a deployment cannot end up with a publicly known admin account.
 */
async function seedStaffUser() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME ?? "Bistro Owner";

  if (!email || !password) {
    throw new Error(
      "SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set to seed the staff user. " +
        "There is deliberately no default."
    );
  }
  if (password.length < 12) {
    throw new Error("SEED_ADMIN_PASSWORD must be at least 12 characters.");
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

  await prisma.staffUser.upsert({
    where: { email },
    update: { name, passwordHash, role: StaffRole.OWNER, isActive: true },
    create: { email, name, passwordHash, role: StaffRole.OWNER },
  });

  return email;
}

async function main() {
  console.log("Seeding...");

  const categoryCount = await seedCategories();
  console.log(`  categories: ${categoryCount}`);

  const tagCount = await seedTags();
  console.log(`  tags:       ${tagCount}`);

  const dishCount = await seedDishes();
  console.log(`  dishes:     ${dishCount}`);

  const settingCount = await seedSettings();
  console.log(`  settings:   ${settingCount}`);

  const adminEmail = await seedStaffUser();
  console.log(`  staff user: ${adminEmail}`);

  console.log("Done.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
