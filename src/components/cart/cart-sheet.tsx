"use client";

import Image from "next/image";
import Link from "next/link";
import { AlertCircleIcon, ShoppingBagIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { QuantityStepper } from "@/components/cart/quantity-stepper";
import { useCart } from "@/components/cart/cart-provider";
import { formatPeso } from "@/lib/currency";
import { SaucerMark } from "@/components/brand/logo";

/** Right-side drawer on desktop, full-height sheet on mobile. */
export function CartSheet() {
  const cart = useCart();

  return (
    <Sheet open={cart.isOpen} onOpenChange={cart.setOpen}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader className="bg-brand-gradient text-white">
          <SheetTitle className="flex items-center gap-2 text-white">
            <ShoppingBagIcon className="size-5" />
            Your Order
          </SheetTitle>
          <SheetDescription className="text-white/85">
            {cart.count > 0
              ? `${cart.count} ${cart.count === 1 ? "item" : "items"} — init pa!`
              : "Wala pang laman, Bossing."}
          </SheetDescription>
        </SheetHeader>

        {cart.error && (
          <div
            role="alert"
            className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 border-b px-5 py-3 text-sm"
          >
            <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
            <p className="flex-1">{cart.error}</p>
            <button
              type="button"
              onClick={cart.dismissError}
              className="font-semibold underline underline-offset-2"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {cart.items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 py-12 text-center">
              <SaucerMark className="size-20 opacity-40" />
              <div>
                <p className="font-display text-lg">Empty pa ang cart</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  Add some flying saucers to get started.
                </p>
              </div>
              <Button asChild variant="brand" onClick={cart.closeCart}>
                <Link href="/menu">Browse Menu</Link>
              </Button>
            </div>
          ) : (
            <ul className="flex flex-col gap-4">
              {cart.items.map((item) => (
                <li key={item.key} className="flex gap-3">
                  <div className="bg-muted relative size-20 shrink-0 overflow-hidden rounded-lg">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="grid size-full place-items-center">
                        <SaucerMark className="size-10 opacity-50" />
                      </div>
                    )}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{item.name}</p>
                        <p className="text-muted-foreground text-sm">
                          {formatPeso(item.unitPrice)} each
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => cart.remove(item.key)}
                        aria-label={`Remove ${item.name} from cart`}
                        className="text-muted-foreground hover:text-destructive tap-target grid shrink-0 place-items-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      >
                        <Trash2Icon className="size-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <QuantityStepper
                        size="sm"
                        label={`${item.name} quantity`}
                        value={item.quantity}
                        min={1}
                        onChange={(next) => cart.setQuantity(item.key, next)}
                      />
                      <span className="font-display text-base">
                        {formatPeso(item.unitPrice * item.quantity)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {cart.items.length > 0 && (
            <div className="mt-6 flex flex-col gap-2">
              <Label htmlFor="cart-notes">Special instructions</Label>
              <Textarea
                id="cart-notes"
                value={cart.notes}
                onChange={(event) => cart.setNotes(event.target.value)}
                placeholder="Halimbawa: extra cheese, walang sibuyas, init pa sana."
                maxLength={300}
                className="min-h-24"
              />
              <p className="text-muted-foreground text-xs">
                {cart.notes.length}/300 characters
              </p>
            </div>
          )}
        </div>

        {cart.items.length > 0 && (
          <SheetFooter className="bg-card border-t pb-safe">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm font-semibold">Subtotal</span>
              <span className="font-display text-2xl">{formatPeso(cart.subtotal)}</span>
            </div>
            <p className="text-muted-foreground text-xs">
              Delivery fee, if any, is confirmed before dispatch.
            </p>
            <Button asChild variant="brand" size="lg" className="w-full" onClick={cart.closeCart}>
              <Link href="/checkout">Proceed to Checkout</Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={cart.clear} className="w-full">
              Clear cart
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
