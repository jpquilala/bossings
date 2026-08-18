"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardListIcon,
  CupSodaIcon,
  LogInIcon,
  MapPinIcon,
  MenuIcon,
  SandwichIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  TruckIcon,
  UserIcon,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Logo } from "@/components/brand/logo";
import { NotificationBell } from "@/components/layout/notification-bell";
import { useCart } from "@/components/cart/cart-provider";
import { UserAvatar } from "@/components/auth/user-avatar";
import { cn } from "@/lib/utils";

type NavLink = { href: string; label: string; icon: React.ElementType };

const BASE_NAV_LINKS: NavLink[] = [
  { href: "/menu", label: "Menu", icon: SandwichIcon },
  { href: "/menu?tab=drinks", label: "Drinks", icon: CupSodaIcon },
  { href: "/location", label: "Location", icon: MapPinIcon },
];

/** Track Order works for guests; My Orders needs an account. */
const TRACK_LINK: NavLink = { href: "/track", label: "Track Order", icon: TruckIcon };
const MY_ORDERS_LINK: NavLink = {
  href: "/account/orders",
  label: "My Orders",
  icon: ClipboardListIcon,
};

function navLinks(isSignedIn: boolean): NavLink[] {
  // /account/orders is behind the auth guard, so showing it to a guest would
  // just bounce them to /login. Guests get order tracking instead.
  return isSignedIn
    ? [...BASE_NAV_LINKS, TRACK_LINK, MY_ORDERS_LINK]
    : [...BASE_NAV_LINKS, TRACK_LINK];
}

export function SiteHeader({
  isSignedIn,
  isStaff,
  fullName = null,
  email = null,
  avatarUrl = null,
}: {
  isSignedIn: boolean;
  isStaff: boolean;
  /** Identity of the signed-in user, for the account button and drawer. */
  fullName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
}) {
  const pathname = usePathname();
  const cart = useCart();
  const links = navLinks(isSignedIn);
  // The drawer closes itself: every link inside is wrapped in <SheetClose>,
  // so no route-change effect is needed.
  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-30 border-b backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-3 sm:px-4">
        {/* Hamburger — mobile only */}
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger
            aria-label="Open menu"
            className="tap-target hover:bg-muted focus-visible:ring-ring grid shrink-0 place-items-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-none md:hidden"
          >
            <MenuIcon className="size-6" />
          </SheetTrigger>

          <SheetContent side="left" className="gap-0 p-0">
            <SheetHeader className="bg-brand-gradient text-white">
              <SheetTitle className="text-white">
                <Logo className="text-white" />
              </SheetTitle>
              <p className="font-display text-gold-300 text-sm">Sarap na Lumilipad!</p>
            </SheetHeader>

            <nav aria-label="Main" className="flex flex-col gap-1 p-3">
              {links.map((link) => (
                <SheetClose asChild key={link.href}>
                  <Link
                    href={link.href}
                    className="hover:bg-muted focus-visible:ring-ring flex min-h-12 items-center gap-3 rounded-lg px-3 font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <link.icon className="text-brand-600 size-5" />
                    {link.label}
                  </Link>
                </SheetClose>
              ))}

              {isStaff && (
                <SheetClose asChild>
                  <Link
                    href="/admin"
                    className="hover:bg-muted focus-visible:ring-ring flex min-h-12 items-center gap-3 rounded-lg px-3 font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <ShieldCheckIcon className="text-brand-600 size-5" />
                    Admin
                  </Link>
                </SheetClose>
              )}

              <SheetClose asChild>
                <Link
                  href={isSignedIn ? "/account/orders" : "/login"}
                  className="hover:bg-muted focus-visible:ring-ring mt-2 flex min-h-12 items-center gap-3 rounded-lg border px-3 font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
                >
                  {isSignedIn ? (
                    <>
                      <UserAvatar
                        fullName={fullName}
                        email={email}
                        avatarUrl={avatarUrl}
                        size={36}
                      />
                      {/* min-w-0 lets the truncation below actually apply. */}
                      <span className="flex min-w-0 flex-col text-left">
                        <span className="truncate leading-tight">
                          {fullName ?? "My Account"}
                        </span>
                        {email && (
                          <span className="text-muted-foreground truncate text-xs font-normal">
                            {email}
                          </span>
                        )}
                      </span>
                    </>
                  ) : (
                    <>
                      <LogInIcon className="text-brand-600 size-5" />
                      Sign In
                    </>
                  )}
                </Link>
              </SheetClose>
            </nav>
          </SheetContent>
        </Sheet>

        {/* Desktop horizontal nav */}
        <nav aria-label="Main" className="hidden shrink-0 items-center gap-1 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "hover:bg-muted focus-visible:ring-ring flex h-11 items-center rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none",
                pathname === link.href.split("?")[0] && "text-brand-600",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Centred logo */}
        <Link
          href="/"
          aria-label="Bossing's Flying Saucer — home"
          className="focus-visible:ring-ring mx-auto flex items-center rounded-lg focus-visible:ring-2 focus-visible:outline-none md:mx-0 md:ml-4"
        >
          <Logo priority />
        </Link>

        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          <NotificationBell />

          <button
            type="button"
            onClick={cart.openCart}
            /* The count comes from localStorage, which the server cannot see.
               Announce it only once hydrated, otherwise the SSR label ("0
               items") and the client label disagree and React warns. */
            aria-label={
              cart.hydrated && cart.count > 0
                ? `Open cart, ${cart.count} ${cart.count === 1 ? "item" : "items"}`
                : "Open cart"
            }
            className="tap-target hover:bg-muted focus-visible:ring-ring relative grid place-items-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <ShoppingBagIcon className="size-5" />
            {cart.hydrated && cart.count > 0 && (
              <span className="bg-brand-600 absolute top-1 right-1 grid min-w-4.5 place-items-center rounded-full px-1 text-[0.625rem] font-bold text-white">
                {cart.count}
              </span>
            )}
          </button>

          <Link
            href={isSignedIn ? "/account/orders" : "/login"}
            aria-label={
              isSignedIn ? `My account — ${fullName ?? email ?? "signed in"}` : "Sign in"
            }
            className="tap-target hover:bg-muted focus-visible:ring-ring hidden items-center gap-2 rounded-lg px-2 transition-colors focus-visible:ring-2 focus-visible:outline-none md:flex"
          >
            {isSignedIn ? (
              <>
                <UserAvatar
                  fullName={fullName}
                  email={email}
                  avatarUrl={avatarUrl}
                  size={28}
                />
                {/* Hidden below lg so a long name cannot crowd the nav. */}
                <span className="hidden max-w-28 truncate text-sm font-semibold lg:inline">
                  {fullName ?? email}
                </span>
              </>
            ) : (
              <UserIcon className="size-5" />
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
