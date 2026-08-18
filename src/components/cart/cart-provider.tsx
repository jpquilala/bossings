"use client";

import * as React from "react";
import { validateCart } from "@/server/cart-actions";
import {
  cartCount,
  cartItemKey,
  cartSubtotal,
  type CartItem,
} from "@/types/cart";

const STORAGE_KEY = "bfs.cart.v1";

type AddInput = {
  productId: string;
  variantId: string | null;
  name: string;
  unitPrice: number;
  imageUrl: string | null;
  quantity?: number;
};

type CartContextValue = {
  items: CartItem[];
  notes: string;
  count: number;
  subtotal: number;
  isOpen: boolean;
  error: string | null;
  hydrated: boolean;
  add: (input: AddInput) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  setNotes: (notes: string) => void;
  openCart: () => void;
  closeCart: () => void;
  setOpen: (open: boolean) => void;
  dismissError: () => void;
};

const CartContext = React.createContext<CartContextValue | null>(null);

export function useCart() {
  const context = React.useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside <CartProvider>");
  return context;
}

function readStored(): { items: CartItem[]; notes: string } {
  if (typeof window === "undefined") return { items: [], notes: "" };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { items: [], notes: "" };
    const parsed = JSON.parse(raw) as { items?: CartItem[]; notes?: string };
    return { items: parsed.items ?? [], notes: parsed.notes ?? "" };
  } catch {
    return { items: [], notes: "" };
  }
}

/** Nothing to subscribe to — this only distinguishes server from client. */
const subscribeNever = () => () => {};

export function CartProvider({ children }: { children: React.ReactNode }) {
  // Lazy initialisers read localStorage during the first client render, so the
  // cart is populated without a state-setting effect. On the server they see
  // `window === undefined` and fall back to an empty cart.
  const [items, setItems] = React.useState<CartItem[]>(() => readStored().items);
  const [notes, setNotes] = React.useState(() => readStored().notes);
  const [isOpen, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Mirrors `items` so mutations can read the current cart without a setState
  // updater. Two rapid taps on "+" therefore still stack correctly.
  const itemsRef = React.useRef(items);
  React.useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // False during SSR and the hydration render, true afterwards. Consumers use
  // it to avoid rendering a count the server could not have known.
  const hydrated = React.useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ items, notes }));
    } catch {
      // Storage full or blocked — cart still works for this session.
    }
  }, [items, notes, hydrated]);

  /**
   * Re-prices the cart on the server. The optimistic state is already applied;
   * if the server disagrees we roll back to its authoritative version.
   */
  const reconcile = React.useCallback((next: CartItem[]) => {
    if (next.length === 0) return;
    const payload = next.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
    }));

    validateCart({ items: payload })
      .then((result) => {
        // Server could not re-price (menu unreachable) — keep what we have.
        if (result.ok && result.unchanged) return;
        if (!result.ok) setError(result.error);

        const authoritative = result.items;
        if (!authoritative) return;

        // Only adopt the server's version if the shopper hasn't changed the
        // cart since this request went out, so a slow response cannot undo a
        // newer tap.
        if (!sameShape(itemsRef.current, next)) return;
        itemsRef.current = authoritative;
        setItems(authoritative);
      })
      .catch(() => {
        // Network failure — keep the optimistic cart, warn at checkout instead.
      });
  }, []);

  const add = React.useCallback(
    (input: AddInput) => {
      setError(null);
      const key = cartItemKey(input.productId, input.variantId);
      const quantity = input.quantity ?? 1;

      // The next cart is derived from a ref rather than inside the setItems
      // updater: updater functions must stay pure, and reconcile() kicks off a
      // Server Action. Calling it from an updater made React warn about
      // updating the Router while rendering CartProvider.
      const current = itemsRef.current;
      const existing = current.find((item) => item.key === key);
      const next = existing
        ? current.map((item) =>
            item.key === key
              ? { ...item, quantity: Math.min(99, item.quantity + quantity) }
              : item,
          )
        : [
            ...current,
            {
              key,
              productId: input.productId,
              variantId: input.variantId,
              name: input.name,
              unitPrice: input.unitPrice,
              imageUrl: input.imageUrl,
              quantity,
            },
          ];

      itemsRef.current = next;
      setItems(next);
      reconcile(next);
    },
    [reconcile],
  );

  const setQuantity = React.useCallback(
    (key: string, quantity: number) => {
      setError(null);
      const current = itemsRef.current;
      const next =
        quantity <= 0
          ? current.filter((item) => item.key !== key)
          : current.map((item) =>
              item.key === key ? { ...item, quantity: Math.min(99, quantity) } : item,
            );

      itemsRef.current = next;
      setItems(next);
      reconcile(next);
    },
    [reconcile],
  );

  const remove = React.useCallback((key: string) => {
    setError(null);
    const next = itemsRef.current.filter((item) => item.key !== key);
    itemsRef.current = next;
    setItems(next);
  }, []);

  const clear = React.useCallback(() => {
    itemsRef.current = [];
    setItems([]);
    setNotes("");
    setError(null);
  }, []);

  const value = React.useMemo<CartContextValue>(
    () => ({
      items,
      notes,
      count: cartCount(items),
      subtotal: cartSubtotal(items),
      isOpen,
      error,
      hydrated,
      add,
      setQuantity,
      remove,
      clear,
      setNotes,
      openCart: () => setOpen(true),
      closeCart: () => setOpen(false),
      setOpen,
      dismissError: () => setError(null),
    }),
    [items, notes, isOpen, error, hydrated, add, setQuantity, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

/** True when two carts hold the same lines and quantities. */
function sameShape(a: CartItem[], b: CartItem[]) {
  if (a.length !== b.length) return false;
  return a.every((item, index) => {
    const other = b[index];
    return other && item.key === other.key && item.quantity === other.quantity;
  });
}
