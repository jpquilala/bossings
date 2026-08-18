import Link from "next/link";
import {
  ClockIcon,
  MapPinIcon,
  SparklesIcon,
  UtensilsCrossedIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoCrest } from "@/components/brand/logo";
import { QuickAccess } from "@/components/layout/quick-access";
import { ProductGrid } from "@/components/menu/product-grid";
import { AiRecommender } from "@/components/ai/ai-recommender";
import { getMenu } from "@/server/menu";
import { STORE } from "@/lib/store";
import { publicEnv } from "@/lib/env";

const TRUST_ITEMS = ["Dine In", "Take Out", "Advance Order", "Delivery"];

export default async function HomePage() {
  const menu = await getMenu().catch(() => []);
  const sandwiches = menu.find((category) => category.slug === "sandwiches");

  return (
    <>
      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="bg-brand-gradient relative overflow-hidden pb-16 text-white">
        <div className="sunburst pointer-events-none absolute inset-0 opacity-70" aria-hidden />
        <div
          className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-white/10 blur-3xl"
          aria-hidden
        />

        <div className="relative mx-auto max-w-6xl px-4 pt-8 pb-6 sm:pt-12 lg:grid lg:grid-cols-2 lg:items-center lg:gap-10 lg:pt-20">
          <div className="text-center lg:text-left">
            {/* Below lg the crest leads the hero; from lg it moves to the
                right-hand column instead, so it is never rendered twice. */}
            <LogoCrest
              priority
              className="mx-auto mb-5 w-52 drop-shadow-2xl sm:w-64 lg:hidden"
            />

            <p className="bg-navy-900/40 ring-gold-400/40 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold tracking-wide uppercase ring-1">
              <MapPinIcon className="size-3.5" />
              {STORE.city}
            </p>

            <h1 className="text-shadow-pop font-display mt-4 text-4xl leading-[0.95] sm:text-5xl lg:text-6xl">
              Sarap na
              <span className="text-gold-400 block">Lumilipad!</span>
            </h1>

            <p className="mx-auto mt-4 max-w-md text-base text-white/90 sm:text-lg lg:mx-0">
              Freshly grilled flying saucer sandwiches. Only P35 each.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Button asChild variant="gold" size="xl" className="w-full sm:w-auto">
                <Link href="/menu">Order Now</Link>
              </Button>
              <Button
                asChild
                size="xl"
                variant="outline"
                className="w-full border-white/70 bg-white/10 text-white hover:bg-white/20 sm:w-auto"
              >
                <Link href="/menu">View Menu</Link>
              </Button>
            </div>
          </div>

          <div className="mt-10 hidden justify-center lg:flex">
            <LogoCrest className="animate-float max-w-md drop-shadow-2xl" />
          </div>
        </div>

        {/* Trust strip */}
        <div className="relative mx-auto max-w-6xl px-4">
          <ul className="bg-navy-900/50 ring-gold-400/30 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-xl px-4 py-3 text-xs font-bold tracking-wide uppercase ring-1 sm:text-sm">
            {TRUST_ITEMS.map((item, index) => (
              <li key={item} className="flex items-center gap-2">
                {index > 0 && <span className="text-gold-400/70" aria-hidden>—</span>}
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <QuickAccess />

      {/* ── AI recommender (NEXT_PUBLIC_AI_ENABLED) ────────── */}
      {/* px-3 matches QuickAccess so both blocks share an edge on desktop. */}
      {publicEnv.aiEnabled && (
        <section className="mx-auto mt-12 max-w-3xl px-3 sm:px-4">
          <AiRecommender />
        </section>
      )}

      {/* ── Featured sandwiches ────────────────────────────── */}
      {sandwiches && sandwiches.products.length > 0 && (
        <section className="mx-auto mt-14 max-w-6xl px-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-brand-600 flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase">
                <SparklesIcon className="size-3.5" />
                Bestsellers
              </p>
              <h2 className="mt-1 text-2xl sm:text-3xl">Pili na, Bossing!</h2>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/menu">See all</Link>
            </Button>
          </div>

          <div className="mt-6">
            <ProductGrid products={sandwiches.products} />
          </div>
        </section>
      )}

      {/* ── How it works ───────────────────────────────────── */}
      <section className="mx-auto mt-16 max-w-6xl px-4">
        <h2 className="text-center text-2xl sm:text-3xl">Paano mag-order?</h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: UtensilsCrossedIcon,
              title: "Pick your saucers",
              body: "Choose your fillings and drinks from the menu.",
            },
            {
              icon: ClockIcon,
              title: "Tell us when",
              body: "Dine in, take out, schedule ahead, or have it delivered.",
            },
            {
              icon: SparklesIcon,
              title: "Init pa!",
              body: "We grill it fresh and ping you the moment it's ready.",
            },
          ].map((step, index) => (
            <li
              key={step.title}
              className="bg-card relative rounded-2xl border p-5 shadow-md"
            >
              <span className="bg-gold-gradient text-navy-900 font-display absolute -top-3 left-5 grid size-8 place-items-center rounded-full text-sm shadow">
                {index + 1}
              </span>
              <step.icon className="text-brand-600 mt-2 size-7" />
              <h3 className="mt-3 text-lg">{step.title}</h3>
              <p className="text-muted-foreground mt-1 text-sm">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Location teaser ────────────────────────────────── */}
      <section className="mx-auto mt-16 max-w-6xl px-4">
        <div className="bg-navy-900 relative overflow-hidden rounded-3xl px-6 py-10 text-center text-white">
          <div className="sunburst pointer-events-none absolute inset-0 opacity-25" aria-hidden />
          <div className="relative">
            <h2 className="text-2xl sm:text-3xl">Hanapin mo kami!</h2>
            <p className="mx-auto mt-3 max-w-md text-white/85">{STORE.address}</p>
            <Button asChild variant="gold" size="lg" className="mt-6">
              <Link href="/location">Get Directions</Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="mb-safe-bar" />
    </>
  );
}
