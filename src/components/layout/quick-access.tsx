import Link from "next/link";
import { CupSodaIcon, MapPinIcon, SandwichIcon, TruckIcon } from "lucide-react";

const TILES = [
  { href: "/menu", label: "Sandwiches", icon: SandwichIcon },
  { href: "/menu?tab=drinks", label: "Drinks", icon: CupSodaIcon },
  { href: "/track", label: "Track Order", icon: TruckIcon },
  { href: "/location", label: "Location", icon: MapPinIcon },
];

/** Four tappable tiles in a single row, directly under the hero. */
export function QuickAccess() {
  return (
    /* `relative z-10` lifts the tiles above the hero they overlap, so the
       negative margin cannot clip their top edge. */
    <nav
      aria-label="Quick access"
      className="relative z-10 mx-auto -mt-8 max-w-3xl px-3 sm:px-4"
    >
      <ul className="grid grid-cols-4 gap-2 sm:gap-3">
        {TILES.map((tile) => (
          <li key={tile.href} className="flex">
            <Link
              href={tile.href}
              className="bg-card focus-visible:ring-ring flex w-full flex-col items-center justify-start gap-1.5 rounded-2xl border p-2 shadow-md transition-transform active:scale-[0.97] focus-visible:ring-2 focus-visible:outline-none sm:gap-2 sm:p-3"
            >
              <span className="bg-brand-gradient grid size-10 shrink-0 place-items-center rounded-xl text-white shadow-sm sm:size-12">
                <tile.icon className="size-5 sm:size-6" />
              </span>
              {/* Fixed two-line box keeps every tile the same height whether
                  its label wraps ("Track Order") or not ("Drinks"). */}
              <span className="flex h-8 items-center text-center text-[0.7rem] leading-tight font-bold text-balance sm:h-9 sm:text-sm">
                {tile.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
