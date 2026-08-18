import { ProductCard } from "@/components/menu/product-card";
import type { MenuProduct } from "@/types/menu";

/** 1 column base, 2 on sm, 3 on md, 4 on lg. */
export function ProductGrid({ products }: { products: MenuProduct[] }) {
  if (products.length === 0) {
    return (
      <p className="text-muted-foreground py-10 text-center text-sm">
        Wala pang items dito. Balik ka mamaya, Bossing!
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <li key={product.id} className="flex">
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}
