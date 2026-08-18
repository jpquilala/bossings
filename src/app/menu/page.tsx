import { Suspense } from "react";
import type { Metadata } from "next";
import { MenuTabs } from "@/components/menu/menu-tabs";
import { AiRecommender } from "@/components/ai/ai-recommender";
import { Skeleton } from "@/components/ui/skeleton";
import { getMenu } from "@/server/menu";
import { publicEnv } from "@/lib/env";

export const metadata: Metadata = {
  title: "Menu",
  description:
    "Flying saucer sandwiches at P35 each — Giniling, Asado, Ham & Cheese, Hungarian — plus Black Gulaman and Lemon Juice.",
};

// The menu is cached; revalidate keeps a fresh copy without a rebuild.
export const revalidate = 300;

export default async function MenuPage() {
  const categories = await getMenu().catch(() => []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="text-center">
        <p className="text-brand-600 text-xs font-bold tracking-widest uppercase">
          Sarap na Lumilipad!
        </p>
        <h1 className="mt-1 text-3xl sm:text-4xl">Our Menu</h1>
        <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm">
          Freshly grilled flying saucer sandwiches. Only P35 each.
        </p>
      </header>

      {publicEnv.aiEnabled && (
        <div className="mt-8">
          <AiRecommender />
        </div>
      )}

      <div className="mt-8">
        {categories.length === 0 ? (
          <EmptyMenu />
        ) : (
          <Suspense fallback={<MenuSkeleton />}>
            <MenuTabs categories={categories} />
          </Suspense>
        )}
      </div>

      <div className="mb-safe-bar" />
    </div>
  );
}

function EmptyMenu() {
  return (
    <div className="border-border rounded-2xl border border-dashed py-16 text-center">
      <p className="font-display text-lg">Menu is loading up</p>
      <p className="text-muted-foreground mx-auto mt-2 max-w-sm text-sm">
        No products found. Run the seed script (<code>npm run db:seed</code>) to
        populate the menu.
      </p>
    </div>
  );
}

function MenuSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-13 w-full rounded-xl" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-80 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
