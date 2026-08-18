"use client";

import * as React from "react";
import { CheckIcon, SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useCart } from "@/components/cart/cart-provider";
import { formatPeso } from "@/lib/currency";
import type { MenuProduct } from "@/types/menu";

/**
 * "Solo Combo" upsell — any sandwich plus any drink, added in one tap.
 * Priced at the sum of its parts; the appeal is convenience, not a discount,
 * so no fake savings are advertised.
 */
export function BundleUpsell({
  sandwiches: allSandwiches,
  drinks: allDrinks,
}: {
  sandwiches: MenuProduct[];
  drinks: MenuProduct[];
}) {
  const cart = useCart();
  // A combo must never propose something that is sold out.
  const sandwiches = allSandwiches.filter((p) => p.isAvailable);
  const drinks = allDrinks.filter((p) => p.isAvailable);
  const [sandwichId, setSandwichId] = React.useState(sandwiches[0]?.id ?? "");
  const [drinkId, setDrinkId] = React.useState(drinks[0]?.id ?? "");
  const [added, setAdded] = React.useState(false);

  React.useEffect(() => {
    if (!added) return;
    const timer = window.setTimeout(() => setAdded(false), 1600);
    return () => window.clearTimeout(timer);
  }, [added]);

  if (sandwiches.length === 0 || drinks.length === 0) return null;

  const sandwich = sandwiches.find((p) => p.id === sandwichId) ?? sandwiches[0];
  const drink = drinks.find((p) => p.id === drinkId) ?? drinks[0];

  /** Cheapest variant keeps the headline combo price honest. */
  function priceOf(product: MenuProduct) {
    if (product.variants.length === 0) {
      return { price: product.basePrice, variantId: null as string | null, label: "" };
    }
    const variant =
      product.variants.find((v) => v.isDefault) ??
      [...product.variants].sort((a, b) => a.price - b.price)[0];
    return { price: variant.price, variantId: variant.id, label: ` (${variant.label})` };
  }

  const sandwichPrice = priceOf(sandwich);
  const drinkPrice = priceOf(drink);
  const total = sandwichPrice.price + drinkPrice.price;

  function handleAdd() {
    cart.add({
      productId: sandwich.id,
      variantId: sandwichPrice.variantId,
      name: `${sandwich.name}${sandwichPrice.label}`,
      unitPrice: sandwichPrice.price,
      imageUrl: sandwich.imageUrl,
    });
    cart.add({
      productId: drink.id,
      variantId: drinkPrice.variantId,
      name: `${drink.name}${drinkPrice.label}`,
      unitPrice: drinkPrice.price,
      imageUrl: drink.imageUrl,
    });
    setAdded(true);
  }

  return (
    <section
      aria-labelledby="bundle-heading"
      className="bg-navy-900 relative overflow-hidden rounded-2xl p-5 text-white shadow-lg sm:p-6"
    >
      <div className="sunburst pointer-events-none absolute inset-0 opacity-25" aria-hidden />

      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end">
        <div className="lg:flex-1">
          <p className="text-gold-400 flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase">
            <SparklesIcon className="size-3.5" />
            Solo Combo
          </p>
          <h2 id="bundle-heading" className="mt-1 text-2xl">
            Sandwich + Drink
          </h2>
          <p className="mt-1 text-sm text-white/80">
            Pair any saucer with any drink. Sulit na sulit, Bossing!
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:flex-1">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bundle-sandwich" className="text-white/90">
              Sandwich
            </Label>
            <Select value={sandwich.id} onValueChange={setSandwichId}>
              <SelectTrigger
                id="bundle-sandwich"
                className="border-white/25 bg-white/10 text-white"
              >
                <SelectValue placeholder="Choose a sandwich" />
              </SelectTrigger>
              <SelectContent>
                {sandwiches.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bundle-drink" className="text-white/90">
              Drink
            </Label>
            <Select value={drink.id} onValueChange={setDrinkId}>
              <SelectTrigger id="bundle-drink" className="border-white/25 bg-white/10 text-white">
                <SelectValue placeholder="Choose a drink" />
              </SelectTrigger>
              <SelectContent>
                {drinks.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-3 lg:flex-col lg:items-stretch">
          <div className="lg:text-center">
            <p className="text-xs text-white/70">Combo total</p>
            <p className="font-display text-gold-400 text-2xl">{formatPeso(total)}</p>
          </div>
          <Button
            variant={added ? "outline" : "gold"}
            size="lg"
            onClick={handleAdd}
            className={added ? "flex-1 border-white/40 bg-white/10 text-white" : "flex-1"}
          >
            {added ? (
              <>
                <CheckIcon className="size-4" />
                Added!
              </>
            ) : (
              "Add Combo"
            )}
          </Button>
        </div>
      </div>
    </section>
  );
}
