"use client";

import { usePathname } from "next/navigation";
import { ShoppingBagIcon } from "lucide-react";
import { useCart } from "@/components/cart/cart-provider";
import { formatPeso } from "@/lib/currency";

/** Fixed bottom bar showing cart count + total. Hidden when the cart is empty. */
export function StickyCartBar() {
  const cart = useCart();
  const pathname = usePathname();

  // Checkout already shows a running total; a second one would just be noise.
  const hidden = pathname.startsWith("/checkout") || pathname.startsWith("/admin");

  if (!cart.hydrated || cart.count === 0 || hidden) return null;

  return (
    <div className="pb-safe fixed inset-x-0 bottom-0 z-40 px-3 pb-3">
      <button
        type="button"
        onClick={cart.openCart}
        className="bg-brand-gradient shadow-brand-900/35 focus-visible:ring-gold-400 mx-auto flex h-16 w-full max-w-3xl items-center justify-between gap-3 rounded-2xl px-4 text-white shadow-2xl transition-transform active:scale-[0.99] focus-visible:ring-4 focus-visible:outline-none"
      >
        <span className="flex items-center gap-3">
          <span className="relative grid size-11 place-items-center rounded-xl bg-white/20">
            <ShoppingBagIcon className="size-5" />
            <span className="bg-gold-500 text-navy-900 absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full px-1 text-xs font-bold">
              {cart.count}
            </span>
          </span>
          <span className="flex flex-col items-start leading-tight">
            <span className="text-xs text-white/80">
              {cart.count} {cart.count === 1 ? "item" : "items"}
            </span>
            <span className="font-display text-lg">{formatPeso(cart.subtotal)}</span>
          </span>
        </span>

        <span className="bg-gold-gradient text-navy-900 font-display grid h-11 place-items-center rounded-xl px-6 text-base">
          Order
        </span>
      </button>
    </div>
  );
}
