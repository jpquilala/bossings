import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";

import { CartProvider } from "@/components/cart/cart-provider";
import { CartSheet } from "@/components/cart/cart-sheet";
import { StickyCartBar } from "@/components/cart/sticky-cart-bar";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { getSessionProfile, isStaff } from "@/server/profile";
import { STORE } from "@/lib/store";
import { publicEnv } from "@/lib/env";

/**
 * Display face for headings. Poppins' geometric, wide letterforms keep
 * "Bossing" and "Pili" legible at large sizes, where Archivo Black's tight
 * apertures ran the I/l/i together. Multiple weights give real hierarchy.
 */
const display = Poppins({
  weight: ["600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

/** Body copy. Inter is drawn specifically for UI text at small sizes. */
const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.siteUrl),
  title: {
    default: `${STORE.name} — ${STORE.tagline}`,
    template: `%s — ${STORE.name}`,
  },
  description:
    "Freshly grilled flying saucer sandwiches. Only P35 each. Dine in, take out, advance order or delivery in San Pablo City, Laguna.",
  openGraph: {
    title: `${STORE.name} — ${STORE.tagline}`,
    description: "Freshly grilled flying saucer sandwiches. Only P35 each.",
    type: "website",
    locale: "en_PH",
    images: [
      {
        url: "/brand/logo-square.png",
        width: 512,
        height: 512,
        alt: STORE.name,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${STORE.name} — ${STORE.tagline}`,
    description: "Freshly grilled flying saucer sandwiches. Only P35 each.",
    images: ["/brand/logo-square.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#e4572e",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // enables env(safe-area-inset-*) on iOS
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Profile is read once here so the header knows about auth + role.
  const profile = await getSessionProfile().catch(() => null);

  return (
    <html lang="en-PH" suppressHydrationWarning>
      <body className={`${display.variable} ${body.variable} font-sans`}>
        <a
          href="#main"
          className="bg-brand-600 focus:ring-gold-400 sr-only rounded-lg px-4 py-2 font-semibold text-white focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:ring-2"
        >
          Skip to content
        </a>

        <CartProvider>
          <div className="flex min-h-dvh flex-col">
            <SiteHeader
              isSignedIn={Boolean(profile)}
              isStaff={isStaff(profile?.role)}
              fullName={profile?.fullName ?? null}
              email={profile?.email ?? null}
              avatarUrl={profile?.avatarUrl ?? null}
            />
            <main id="main" className="flex-1">
              {children}
            </main>
            <SiteFooter />
          </div>

          <CartSheet />
          <StickyCartBar />
        </CartProvider>
      </body>
    </html>
  );
}
