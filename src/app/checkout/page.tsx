import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { getSessionProfile } from "@/server/profile";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Place your Bossing's Flying Saucer order.",
};

export default async function CheckoutPage() {
  // Signed-in customers get their saved contact details prefilled.
  const profile = await getSessionProfile().catch(() => null);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl sm:text-4xl">Checkout</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Konting detalye na lang, Bossing!
        </p>
      </header>

      <CheckoutForm
        defaultName={profile?.fullName ?? ""}
        defaultPhone={profile?.phone ?? ""}
      />

      <div className="mb-safe-bar" />
    </div>
  );
}
