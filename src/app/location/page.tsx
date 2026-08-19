import type { Metadata } from "next";
import { MapPinIcon, NavigationIcon, PhoneIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StoreHours } from "@/components/location/store-hours";
import { getSessionProfile, isStaff } from "@/server/profile";
import { STORE } from "@/lib/store";

export const metadata: Metadata = {
  title: "Location & Hours",
  description: `Find Bossing's Flying Saucer: ${STORE.address}`,
};

export default async function LocationPage() {
  const profile = await getSessionProfile().catch(() => null);
  const canEdit = isStaff(profile?.role);

  // z=17 frames the stall and its surrounding landmarks; the default zoom for a
  // bare coordinate is wide enough to be unhelpful on a phone.
  const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(
    STORE.mapQuery,
  )}&z=17&output=embed`;
  // Directions route to the exact coordinates rather than a place name, so the
  // pin cannot drift to a similarly-named business.
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    STORE.mapQuery,
  )}`;
  const telHref = `tel:+63${STORE.phoneDigits.slice(1)}`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="text-center">
        <h1 className="text-3xl sm:text-4xl">Hanapin mo kami!</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Kain dito sa stall, take out, schedule ahead, or have it delivered around San
          Pablo City.
        </p>
      </header>

      {/* Address */}
      <Card className="mt-6">
        <CardContent className="flex flex-col gap-4 pt-6">
          <div className="flex items-start gap-3">
            <span className="bg-brand-gradient grid size-11 shrink-0 place-items-center rounded-xl text-white">
              <MapPinIcon className="size-5" />
            </span>
            <div>
              <h2 className="font-display text-base">Our stall</h2>
              <address className="mt-1 text-sm not-italic">{STORE.address}</address>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild variant="brand" size="lg" className="flex-1">
              <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
                <NavigationIcon className="size-4" />
                Get Directions
              </a>
            </Button>
            <Button asChild variant="outline" size="lg" className="flex-1">
              <a href={telHref}>
                <PhoneIcon className="size-4" />
                {STORE.phoneDisplay}
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Map */}
      <Card className="mt-6 overflow-hidden">
        <div className="bg-muted aspect-4/3 w-full sm:aspect-video">
          <iframe
            title={`Map showing ${STORE.name} in ${STORE.city}`}
            src={mapSrc}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
            className="size-full border-0"
          />
        </div>
      </Card>

      {/* Hours */}
      <Card className="mt-6">
        <CardContent className="pt-6">
          <StoreHours canEdit={canEdit} />
        </CardContent>
      </Card>

      <div className="mb-safe-bar" />
    </div>
  );
}
