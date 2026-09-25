/**
 * Where the site is served from. Set NEXT_PUBLIC_SITE_URL for the real domain;
 * canonical URLs, Open Graph images and the structured data all read it.
 */
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://bistro.example")
).replace(/\/$/, "");

/** Placeholder contact details. Replace with the restaurant's own before launch. */
const address = {
  street: "142 Elm Street",
  locality: "Downtown",
  region: "NY",
  postalCode: "10012",
  country: "US",
};

/**
 * Opening hours in machine form, for the structured data. The display strings
 * below are written from the same shifts, so the two cannot drift apart.
 */
const openingHours = [
  { days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "11:30", closes: "22:00" },
  { days: ["Saturday"], opens: "10:00", closes: "23:00" },
  { days: ["Sunday"], opens: "10:00", closes: "21:00" },
];

export const restaurantInfo = {
  name: "Bistro",
  tagline: "Where Every Meal Becomes a Memory",
  description:
    "Nestled in the heart of the city, Bistro offers an intimate dining experience where culinary artistry meets timeless elegance. Every dish tells a story, every visit becomes a cherished moment.",
  foundedYear: 2018,
  phone: "+1 (555) 234-5678",
  /** wa.me takes digits only — no plus, no separators. */
  whatsapp: "15552345678",
  email: "hello@bistro.com",
  address: `${address.street}, ${address.locality}, ${address.region} ${address.postalCode}`,
  addressParts: address,
  openingHours,
  hours: {
    weekday: "Mon–Fri: 11:30 AM – 10:00 PM",
    weekend: "Sat: 10:00 AM – 11:00 PM",
    sunday: "Sun: 10:00 AM – 9:00 PM",
  },
  social: {
    instagram: "https://instagram.com/bistro",
    facebook: "https://facebook.com/bistro",
  },
};

/** Share card image, 1.91:1 as Open Graph expects. */
export const ogImage =
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&h=630&fit=crop";

/** Digits-only form for tel: links. */
export const telHref = `tel:${restaurantInfo.phone.replace(/[^\d+]/g, "")}`;

export const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  restaurantInfo.address
)}`;

/** Every WhatsApp entry point on the site builds its link here. */
export function whatsappLink(message: string): string {
  return `https://wa.me/${restaurantInfo.whatsapp}?text=${encodeURIComponent(
    message
  )}`;
}

export const whatsappMessages = {
  reservation: `Hi! I would like to make a reservation at ${restaurantInfo.name}.`,
  order: `Hi! I would like to place an order at ${restaurantInfo.name}.`,
  question: `Hi! I have a question about ${restaurantInfo.name}.`,
};

export type MenuCategory = "Entrées" | "Plats" | "Desserts" | "Boissons";

export const menuCategories: MenuCategory[] = [
  "Entrées",
  "Plats",
  "Desserts",
  "Boissons",
];

export interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: string;
  category: MenuCategory;
  image: string;
  tags?: string[];
  /** Shown in the Signature Dishes row on the home page. */
  featured?: boolean;
}

export const menuItems: MenuItem[] = [
  {
    id: 1,
    name: "Burrata & Heirloom Tomato",
    description:
      "Creamy burrata cheese over ripe heirloom tomatoes, drizzled with aged balsamic and fresh basil.",
    price: "$18",
    category: "Entrées",
    image:
      "https://images.unsplash.com/photo-1608897013039-887f21d8c804?w=1000&h=750&fit=crop",
    tags: ["Vegetarian", "Gluten-Free"],
    featured: true,
  },
  {
    id: 2,
    name: "Tuna Tartare",
    description:
      "Fresh yellowfin tuna with avocado mousse, crispy shallots, and a citrus soy dressing.",
    price: "$22",
    category: "Entrées",
    image:
      "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=1000&h=750&fit=crop",
    tags: ["Gluten-Free"],
  },
  {
    id: 3,
    name: "French Onion Soup",
    description:
      "Classic caramelized onion soup with a golden Gruyère crust and crusty sourdough crouton.",
    price: "$14",
    category: "Entrées",
    image:
      "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=1000&h=750&fit=crop",
  },
  {
    id: 4,
    name: "Pan-Seared Salmon",
    description:
      "Atlantic salmon with a crispy skin, served on a bed of lemon risotto and asparagus tips.",
    price: "$36",
    category: "Plats",
    image:
      "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=1000&h=750&fit=crop",
    tags: ["Gluten-Free"],
    featured: true,
  },
  {
    id: 5,
    name: "Wagyu Ribeye",
    description:
      "Prime wagyu ribeye, dry-aged 28 days, served with truffle mashed potatoes and roasted bone marrow.",
    price: "$62",
    category: "Plats",
    image:
      "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=1000&h=750&fit=crop",
    tags: ["Signature"],
    featured: true,
  },
  {
    id: 6,
    name: "Wild Mushroom Risotto",
    description:
      "Arborio rice slow-cooked with porcini, chanterelle, and shiitake mushrooms, finished with Parmigiano.",
    price: "$28",
    category: "Plats",
    image:
      "https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=1000&h=750&fit=crop",
    tags: ["Vegetarian"],
  },
  {
    id: 7,
    name: "Crème Brûlée",
    description:
      "Classic Madagascar vanilla bean crème brûlée with a perfectly caramelized sugar crust.",
    price: "$14",
    category: "Desserts",
    image:
      "https://images.unsplash.com/photo-1470324161839-ce2bb6fa6bc3?w=1000&h=750&fit=crop",
    tags: ["Gluten-Free"],
  },
  {
    id: 8,
    name: "Chocolate Fondant",
    description:
      "Warm dark chocolate lava cake with a molten center, served with vanilla bean ice cream.",
    price: "$16",
    category: "Desserts",
    image:
      "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=1000&h=750&fit=crop",
  },
  {
    id: 9,
    name: "Tarte Tatin",
    description:
      "Upside-down apple tart with caramelized Granny Smith apples, puff pastry, and crème fraîche.",
    price: "$15",
    category: "Desserts",
    image:
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1000&h=750&fit=crop",
  },
  {
    id: 10,
    name: "Sommelier Red Selection",
    description:
      "A curated glass of red wine chosen by our sommelier to sit alongside your meal.",
    price: "$18",
    category: "Boissons",
    image:
      "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=1000&h=750&fit=crop",
    tags: ["Wine"],
  },
  {
    id: 11,
    name: "Lavender Spritz",
    description:
      "House-made lavender syrup with prosecco, a splash of soda, and a twist of lemon.",
    price: "$15",
    category: "Boissons",
    image:
      "https://images.unsplash.com/photo-1536935338788-846bb9981813?w=1000&h=750&fit=crop",
    tags: ["Cocktail"],
  },
  {
    id: 12,
    name: "Espresso Martini",
    description:
      "Freshly pulled espresso shaken with vodka, coffee liqueur, and a touch of vanilla.",
    price: "$17",
    category: "Boissons",
    image:
      "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=1000&h=750&fit=crop",
    tags: ["Cocktail"],
  },
];

export const featuredItems = menuItems.filter((item) => item.featured);

export interface Testimonial {
  id: number;
  name: string;
  role: string;
  quote: string;
  avatar: string;
}

export const testimonials: Testimonial[] = [
  {
    id: 1,
    name: "Sophia Laurent",
    role: "Food critic, The Daily Plate",
    quote:
      "Bistro is a rare gem — a place where every plate is a masterpiece and every evening feels like a celebration. The wagyu alone is worth the visit.",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=112&h=112&fit=crop&crop=face",
  },
  {
    id: 2,
    name: "Marcus Chen",
    role: "Regular guest",
    quote:
      "My wife and I have our anniversary here every year. The ambiance, the service, the food — it never disappoints. Bistro is our happy place.",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=112&h=112&fit=crop&crop=face",
  },
  {
    id: 3,
    name: "Elena Vasquez",
    role: "Event planner",
    quote:
      "I have hosted dozens of private events at Bistro. The team goes above and beyond — the attention to detail is simply unmatched in this city.",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=112&h=112&fit=crop&crop=face",
  },
];

export type GalleryCategory = "Interior" | "Food" | "Drinks";

export const galleryCategories: GalleryCategory[] = [
  "Interior",
  "Food",
  "Drinks",
];

export interface GalleryImage {
  id: number;
  src: string;
  alt: string;
  category: GalleryCategory;
  /** Intrinsic size, so the grid reserves the space before the image lands. */
  width: number;
  height: number;
}

export const galleryImages: GalleryImage[] = [
  {
    id: 1,
    src: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=900&h=1200&fit=crop",
    alt: "Dining room at dusk, tables set under low pendant lights",
    category: "Interior",
    width: 900,
    height: 1200,
  },
  {
    id: 2,
    src: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&h=800&fit=crop",
    alt: "A chef finishing a plate at the pass",
    category: "Food",
    width: 1200,
    height: 800,
  },
  {
    id: 3,
    src: "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=900&h=1200&fit=crop",
    alt: "A stirred cocktail with a citrus twist on the bar",
    category: "Drinks",
    width: 900,
    height: 1200,
  },
  {
    id: 4,
    src: "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1200&h=800&fit=crop",
    alt: "A table for two laid with candles and linen",
    category: "Interior",
    width: 1200,
    height: 800,
  },
  {
    id: 5,
    src: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200&h=900&fit=crop",
    alt: "Wood-fired flatbread with basil, straight from the oven",
    category: "Food",
    width: 1200,
    height: 900,
  },
  {
    id: 6,
    src: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=900&h=1200&fit=crop",
    alt: "Red wine poured into a crystal glass",
    category: "Drinks",
    width: 900,
    height: 1200,
  },
  {
    id: 7,
    src: "https://images.unsplash.com/photo-1600891964092-4316c288032e?w=1200&h=800&fit=crop",
    alt: "A seared steak rested and sliced on the board",
    category: "Food",
    width: 1200,
    height: 800,
  },
  {
    id: 8,
    src: "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=1200&h=900&fit=crop",
    alt: "The bar, bottles backlit along the shelf",
    category: "Interior",
    width: 1200,
    height: 900,
  },
  {
    id: 9,
    src: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=900&h=1200&fit=crop",
    alt: "A plated dessert finished with a drizzle",
    category: "Food",
    width: 900,
    height: 1200,
  },
  {
    id: 10,
    src: "https://images.unsplash.com/photo-1544148103-0773bf10d330?w=1200&h=800&fit=crop",
    alt: "Late light across the terrace tables",
    category: "Interior",
    width: 1200,
    height: 800,
  },
  {
    id: 11,
    src: "https://images.unsplash.com/photo-1511920170033-f8396924c348?w=900&h=1200&fit=crop",
    alt: "Espresso pulling into a warmed cup",
    category: "Drinks",
    width: 900,
    height: 1200,
  },
  {
    id: 12,
    src: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=1200&h=800&fit=crop",
    alt: "Garden salad scattered with edible flowers",
    category: "Food",
    width: 1200,
    height: 800,
  },
];

export const restaurantHistory = {
  tagline: `A neighborhood staple since ${restaurantInfo.foundedYear}`,
  story:
    "Bistro began as a simple idea — bring honest, beautifully prepared food to a space that feels like home. What started in a modest corner of the neighborhood has grown into a gathering place where friends, families, and strangers become regulars.",
  local:
    "Nestled in the heart of the community, we draw from the rhythms of the neighborhood. The morning market informs our menu, the changing seasons guide our plate, and the people who walk through our doors shape who we are.",
  photo:
    "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=1200&h=1500&fit=crop",
  stats: [
    {
      label: "Years open",
      // Derived, so the figure cannot go stale in the client's hands.
      value: `${new Date().getFullYear() - restaurantInfo.foundedYear}`,
    },
    { label: "Seasonal menus", value: "28" },
    { label: "Local partners", value: "40+" },
  ],
};
