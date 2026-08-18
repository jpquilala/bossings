import Link from "next/link";
import { MapPinIcon, PhoneIcon } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { STORE } from "@/lib/store";

export function SiteFooter() {
  return (
    <footer className="bg-navy-900 mt-16 text-white/80">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <Logo className="text-white" />
          <p className="font-display text-gold-400 mt-3 text-lg">Sarap na Lumilipad!</p>
          <p className="mt-2 max-w-xs text-sm">
            Freshly grilled flying saucer sandwiches, proudly served in San Pablo City, Laguna.
          </p>
        </div>

        <div>
          <h2 className="font-display text-base text-white">Visit us</h2>
          <p className="mt-2 flex items-start gap-2 text-sm">
            <MapPinIcon className="text-gold-400 mt-0.5 size-4 shrink-0" />
            <span>{STORE.address}</span>
          </p>
          <a
            href={`tel:+63${STORE.phoneDigits.slice(1)}`}
            className="hover:text-gold-400 focus-visible:ring-gold-400 mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none"
          >
            <PhoneIcon className="text-gold-400 size-4" />
            {STORE.phoneDisplay}
          </a>
        </div>

        <nav aria-label="Footer">
          <h2 className="font-display text-base text-white">Quick links</h2>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {[
              { href: "/menu", label: "Menu" },
              { href: "/checkout", label: "Checkout" },
              { href: "/track", label: "Track Order" },
              { href: "/account/orders", label: "My Orders" },
              { href: "/location", label: "Location & Hours" },
            ].map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="hover:text-gold-400 focus-visible:ring-gold-400 inline-flex min-h-11 items-center rounded-lg focus-visible:ring-2 focus-visible:outline-none"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-white/10 px-4 py-4">
        <p className="mx-auto max-w-6xl text-xs text-white/60">
          © {new Date().getFullYear()} Bossing&apos;s Flying Saucer. All prices in Philippine Peso.
        </p>
      </div>
    </footer>
  );
}
