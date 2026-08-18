"use client";

import * as React from "react";
import Image from "next/image";
import { CheckIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PriceBadge } from "@/components/brand/price-badge";
import { QuantityStepper } from "@/components/cart/quantity-stepper";
import { SaucerMark } from "@/components/brand/logo";
import { useCart } from "@/components/cart/cart-provider";
import { formatPeso } from "@/lib/currency";
import { cn } from "@/lib/utils";
import type { MenuProduct } from "@/types/menu";

export function ProductCard({ product }: { product: MenuProduct }) {
  const cart = useCart();
  const hasVariants = product.variants.length > 0;
  const soldOut = !product.isAvailable;

  const defaultVariantId = React.useMemo(() => {
    if (!hasVariants) return null;
    return (product.variants.find((v) => v.isDefault) ?? product.variants[0]).id;
  }, [hasVariants, product.variants]);

  const [variantId, setVariantId] = React.useState<string | null>(defaultVariantId);
  const [quantity, setQuantity] = React.useState(1);
  const [justAdded, setJustAdded] = React.useState(false);

  const selectedVariant = product.variants.find((v) => v.id === variantId) ?? null;
  const unitPrice = selectedVariant ? selectedVariant.price : product.basePrice;
  const displayName = selectedVariant
    ? `${product.name} (${selectedVariant.label})`
    : product.name;

  // The "Added!" confirmation resets itself so the button returns to normal.
  React.useEffect(() => {
    if (!justAdded) return;
    const timer = window.setTimeout(() => setJustAdded(false), 1600);
    return () => window.clearTimeout(timer);
  }, [justAdded]);

  function handleAdd() {
    if (soldOut) return;
    cart.add({
      productId: product.id,
      variantId,
      name: displayName,
      unitPrice,
      imageUrl: product.imageUrl,
      quantity,
    });
    setQuantity(1);
    setJustAdded(true);
  }

  const headingId = `product-${product.id}-name`;

  return (
    <Card
      className={cn("group w-full overflow-hidden pt-0", soldOut && "opacity-75")}
      aria-labelledby={headingId}
    >
      <div className="bg-brand-100 relative aspect-4/3 overflow-hidden">
        {soldOut && (
          <div className="absolute inset-0 z-20 grid place-items-center bg-navy-900/55">
            <Badge variant="navy" className="px-3 py-1.5 text-sm">
              Sold out
            </Badge>
          </div>
        )}
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw"
            className={cn("object-cover", soldOut && "grayscale")}
          />
        ) : (
          <div className="sunburst grid size-full place-items-center bg-brand-gradient">
            <SaucerMark className="size-24 drop-shadow-lg" />
          </div>
        )}

        <PriceBadge centavos={unitPrice} className="absolute -right-1 -bottom-4 z-10" />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4 pt-5">
        <div>
          <h3 id={headingId} className="pr-12 text-base leading-tight">
            {product.name}
          </h3>
          {product.description && (
            <p className="text-muted-foreground mt-1 text-sm">{product.description}</p>
          )}
        </div>

        {hasVariants && (
          <fieldset className="min-w-0">
            <legend className="text-muted-foreground mb-1.5 text-xs font-bold tracking-wide uppercase">
              Size
            </legend>
            <div className="flex flex-wrap gap-2">
              {product.variants.map((variant) => {
                const active = variant.id === variantId;
                return (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => setVariantId(variant.id)}
                    disabled={soldOut}
                    aria-pressed={active}
                    className={cn(
                      "focus-visible:ring-ring flex min-h-11 items-center gap-1.5 rounded-lg border-2 px-3 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none",
                      active
                        ? "border-brand-600 bg-brand-600 text-white"
                        : "border-input hover:bg-muted",
                      soldOut && "cursor-not-allowed opacity-60",
                    )}
                  >
                    <span>{variant.label}</span>
                    <span className={cn("text-xs", active ? "text-white/80" : "text-muted-foreground")}>
                      {formatPeso(variant.price)}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        <div className="mt-auto flex items-center gap-2 pt-1">
          <QuantityStepper
            value={quantity}
            onChange={setQuantity}
            label={`${product.name} quantity`}
            size="sm"
            disabled={soldOut}
          />
          <Button
            variant={justAdded ? "gold" : "brand"}
            onClick={handleAdd}
            disabled={soldOut}
            className="min-w-0 flex-1"
          >
            {soldOut ? (
              "Sold out"
            ) : justAdded ? (
              <>
                <CheckIcon className="size-4" />
                Added!
              </>
            ) : (
              <>
                <PlusIcon className="size-4" />
                Add
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
