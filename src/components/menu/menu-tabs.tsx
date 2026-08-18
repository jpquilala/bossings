"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductGrid } from "@/components/menu/product-grid";
import { BundleUpsell } from "@/components/menu/bundle-upsell";
import type { MenuCategory } from "@/types/menu";

export function MenuTabs({ categories }: { categories: MenuCategory[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requested = searchParams.get("tab");

  // The URL is the single source of truth for the active tab, so navigating
  // from Quick Access (/menu?tab=drinks) needs no state synchronisation.
  const fallback = categories[0]?.slug ?? "";
  const valid = categories.some((category) => category.slug === requested);
  const value = valid ? requested! : fallback;

  const sandwiches = categories.find((c) => c.slug === "sandwiches")?.products ?? [];
  const drinks = categories.find((c) => c.slug === "drinks")?.products ?? [];

  function handleChange(next: string) {
    // Shallow URL update so the tab is shareable without a full navigation.
    router.replace(`/menu?tab=${next}`, { scroll: false });
  }

  return (
    <Tabs value={value} onValueChange={handleChange}>
      <TabsList>
        {categories.map((category) => (
          <TabsTrigger key={category.slug} value={category.slug}>
            {category.name}
          </TabsTrigger>
        ))}
      </TabsList>

      {categories.map((category) => (
        <TabsContent key={category.slug} value={category.slug} className="flex flex-col gap-6">
          <ProductGrid products={category.products} />
          {category.slug === "sandwiches" && (
            <BundleUpsell sandwiches={sandwiches} drinks={drinks} />
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}
