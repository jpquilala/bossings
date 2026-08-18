"use server";

import { z } from "zod";
import { getMenuProducts } from "@/server/menu";
import { cartItemKey, type CartItem } from "@/types/cart";

const lineSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1).nullable(),
  quantity: z.number().int().min(1).max(99),
});

const validateSchema = z.object({ items: z.array(lineSchema).max(50) });

export type ValidateCartResult =
  /** Re-priced successfully — `items` is authoritative. */
  | { ok: true; items: CartItem[]; unchanged?: false }
  /** Could not re-price; the client should keep its current cart. */
  | { ok: true; unchanged: true; items?: undefined }
  | { ok: false; error: string; items?: CartItem[] };

/**
 * Re-prices a cart against the live menu. The client keeps cart state locally
 * for instant feedback, but prices and availability are only ever trusted from
 * here — a stale or tampered client price is discarded.
 */
export async function validateCart(input: unknown): Promise<ValidateCartResult> {
  const parsed = validateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "That cart doesn't look right. Please try again." };
  }

  // If the menu is unreachable, leave the cart exactly as the customer built
  // it. Reporting everything as sold out would empty it for no good reason —
  // prices are re-checked authoritatively at checkout regardless.
  let products: Awaited<ReturnType<typeof getMenuProducts>>;
  try {
    products = await getMenuProducts();
  } catch {
    return { ok: true, unchanged: true };
  }

  const byId = new Map(products.map((product) => [product.id, product]));

  const items: CartItem[] = [];
  const dropped: string[] = [];

  for (const line of parsed.data.items) {
    const product = byId.get(line.productId);
    if (!product || !product.isAvailable) {
      if (product) dropped.push(product.name);
      continue;
    }

    let unitPrice = product.basePrice;
    let name = product.name;

    if (line.variantId) {
      const variant = product.variants.find((v) => v.id === line.variantId);
      if (!variant) {
        dropped.push(product.name);
        continue;
      }
      unitPrice = variant.price;
      name = `${product.name} (${variant.label})`;
    } else if (product.variants.length > 0) {
      // Product requires a variant choice but none was supplied — use default.
      const fallback =
        product.variants.find((v) => v.isDefault) ?? product.variants[0];
      unitPrice = fallback.price;
      name = `${product.name} (${fallback.label})`;
      line.variantId = fallback.id;
    }

    items.push({
      key: cartItemKey(line.productId, line.variantId),
      productId: line.productId,
      variantId: line.variantId,
      name,
      unitPrice,
      quantity: line.quantity,
      imageUrl: product.imageUrl,
    });
  }

  if (dropped.length > 0) {
    return {
      ok: false,
      error: `Sorry Bossing, ${dropped.join(", ")} just ran out. We removed it from your cart.`,
      items,
    };
  }

  return { ok: true, items };
}
