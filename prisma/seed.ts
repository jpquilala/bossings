/**
 * Seeds the menu. Idempotent — safe to re-run; products are upserted by slug.
 *
 *   npm run db:seed
 */
import { config as loadEnv } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma";

// Prisma 7 does not load .env automatically, and `tsx` runs this directly.
// `.env.local` wins, matching Next.js precedence.
loadEnv({ path: ".env.local", quiet: true });
loadEnv({ path: ".env", quiet: true });

// Seed over the direct connection — the pooler is not needed for a one-shot script.
const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  }),
});

/** Peso helper — the database stores centavos. */
const P = (pesos: number) => pesos * 100;

const CATEGORIES = [
  { name: "Sandwiches", slug: "sandwiches", sortOrder: 1 },
  { name: "Drinks", slug: "drinks", sortOrder: 2 },
];

const PRODUCTS: {
  categorySlug: string;
  name: string;
  slug: string;
  description: string;
  basePrice: number;
  sortOrder: number;
  variants?: { label: string; price: number; isDefault: boolean }[];
}[] = [
  // ── Sandwiches, P35 each ──
  {
    categorySlug: "sandwiches",
    name: "Tinadtad / Giniling",
    slug: "tinadtad-giniling",
    description: "Savory seasoned ground pork filling",
    basePrice: P(35),
    sortOrder: 1,
  },
  {
    categorySlug: "sandwiches",
    name: "Asado",
    slug: "asado",
    description: "Sweet-savory braised asado filling",
    basePrice: P(35),
    sortOrder: 2,
  },
  {
    categorySlug: "sandwiches",
    name: "Ham & Cheese",
    slug: "ham-and-cheese",
    description: "Classic ham with melted cheese",
    basePrice: P(35),
    sortOrder: 3,
  },
  {
    categorySlug: "sandwiches",
    name: "Hungarian (1/2 sliced)",
    slug: "hungarian-half-sliced",
    description: "Half-sliced Hungarian sausage, smoky and juicy",
    basePrice: P(35),
    sortOrder: 4,
  },

  // ── Drinks ──
  {
    categorySlug: "drinks",
    name: "Black Gulaman",
    slug: "black-gulaman",
    description: "Sweet iced gulaman — panlaban sa init",
    // basePrice mirrors the cheapest variant so listings without a size still price correctly.
    basePrice: P(10),
    sortOrder: 1,
    variants: [
      { label: "10oz", price: P(10), isDefault: true },
      { label: "16oz", price: P(25), isDefault: false },
    ],
  },
  {
    categorySlug: "drinks",
    name: "Lemon Juice",
    slug: "lemon-juice",
    description: "Fresh and tangy, ice cold",
    basePrice: P(10),
    sortOrder: 2,
  },
];

async function main() {
  console.log("Seeding Bossing's Flying Saucer menu…");

  const categoryIdBySlug = new Map<string, string>();

  for (const category of CATEGORIES) {
    const record = await prisma.category.upsert({
      where: { slug: category.slug },
      create: category,
      update: { name: category.name, sortOrder: category.sortOrder },
    });
    categoryIdBySlug.set(category.slug, record.id);
    console.log(`  category: ${record.name}`);
  }

  for (const product of PRODUCTS) {
    const categoryId = categoryIdBySlug.get(product.categorySlug);
    if (!categoryId) throw new Error(`Unknown category ${product.categorySlug}`);

    const record = await prisma.product.upsert({
      where: { slug: product.slug },
      create: {
        categoryId,
        name: product.name,
        slug: product.slug,
        description: product.description,
        basePrice: product.basePrice,
        sortOrder: product.sortOrder,
        isAvailable: true,
      },
      update: {
        categoryId,
        name: product.name,
        description: product.description,
        basePrice: product.basePrice,
        sortOrder: product.sortOrder,
      },
    });

    // Replace variants wholesale so removed sizes do not linger.
    if (product.variants?.length) {
      await prisma.productVariant.deleteMany({ where: { productId: record.id } });
      await prisma.productVariant.createMany({
        data: product.variants.map((variant) => ({ ...variant, productId: record.id })),
      });
    }

    const priceLabel = product.variants
      ? product.variants.map((v) => `${v.label} P${v.price / 100}`).join(" / ")
      : `P${product.basePrice / 100}`;
    console.log(`  product:  ${record.name} — ${priceLabel}`);
  }

  console.log("Done. Sarap na lumilipad!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
