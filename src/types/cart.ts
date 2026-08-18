export type CartItem = {
  /** Stable key: productId or `${productId}:${variantId}`. */
  key: string;
  productId: string;
  variantId: string | null;
  /** Display name including the variant label, e.g. "Black Gulaman (16oz)". */
  name: string;
  /** Centavos. */
  unitPrice: number;
  quantity: number;
  imageUrl: string | null;
};

export type CartState = {
  items: CartItem[];
  notes: string;
};

export function cartItemKey(productId: string, variantId: string | null) {
  return variantId ? `${productId}:${variantId}` : productId;
}

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}
