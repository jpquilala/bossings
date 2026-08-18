import "server-only";
import { prisma } from "@/lib/prisma";
import { cached, cacheDel } from "@/lib/cache";
import { captureException } from "@/lib/monitoring";
import type { MenuCategory } from "@/types/menu";

const MENU_CACHE_KEY = "menu:v1";
const MENU_TTL_SECONDS = 300;
/** Upper bound on a menu read before the page falls back to its empty state. */
const MENU_QUERY_TIMEOUT_MS = 8_000;

/**
 * The full menu, cached. Only available products are returned.
 *
 * Never throws: if the database is unreachable the caller gets an empty menu
 * and the page renders its empty state, rather than the whole route failing.
 */
export async function getMenu(): Promise<MenuCategory[]> {
  try {
    return await withTimeout(loadMenu(), MENU_QUERY_TIMEOUT_MS);
  } catch (error) {
    captureException(error, { source: "getMenu" });
    return [];
  }
}

/**
 * Races a promise against a deadline.
 *
 * The driver can settle its rejection outside the awaited chain, which leaves
 * the render waiting indefinitely instead of failing. The deadline guarantees
 * the page always gets an answer.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Menu query exceeded ${ms}ms`)),
      ms,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function loadMenu(): Promise<MenuCategory[]> {
  return cached(MENU_CACHE_KEY, MENU_TTL_SECONDS, async () => {
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        products: {
          // Unavailable products are returned too: the storefront shows them
          // greyed out with a "Sold out" badge rather than making them vanish,
          // which sets expectations for the next visit. Ordering and checkout
          // still reject them server-side.
          orderBy: { sortOrder: "asc" },
          include: { variants: { orderBy: { price: "asc" } } },
        },
      },
    });

    return categories.map<MenuCategory>((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      sortOrder: category.sortOrder,
      products: category.products.map((product) => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        basePrice: product.basePrice,
        imageUrl: product.imageUrl,
        isAvailable: product.isAvailable,
        sortOrder: product.sortOrder,
        variants: product.variants.map((variant) => ({
          id: variant.id,
          label: variant.label,
          price: variant.price,
          isDefault: variant.isDefault,
        })),
      })),
    }));
  });
}

/**
 * Flattened product list for AI context and price lookups.
 *
 * Unlike getMenu() this propagates errors: callers price orders against it, so
 * an empty list caused by an outage must not be mistaken for "sold out" and
 * silently drop a customer's items.
 */
export async function getMenuProducts() {
  const menu = await loadMenu();
  return menu.flatMap((category) =>
    category.products.map((product) => ({ ...product, categoryName: category.name })),
  );
}

/** Call after any admin mutation to products/categories. */
export async function invalidateMenuCache() {
  await cacheDel("menu:");
}
