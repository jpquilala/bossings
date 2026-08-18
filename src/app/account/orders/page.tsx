import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ChevronRightIcon,
  LogOutIcon,
  ReceiptTextIcon,
  TruckIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/auth/user-avatar";
import { PROVIDER_LABEL, ProviderIcon } from "@/components/auth/provider-badge";
import { getSessionProfile } from "@/server/profile";
import { getOrdersForUser } from "@/server/orders";
import { signOut } from "@/server/auth-actions";
import { formatPeso } from "@/lib/currency";
import { ORDER_STATUS_LABEL, ORDER_TYPE_LABEL } from "@/types/order";

export const metadata: Metadata = {
  title: "My orders",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AccountOrdersPage() {
  const profile = await getSessionProfile().catch(() => null);
  // Middleware already guards this route; this is the belt-and-braces check.
  if (!profile) redirect("/login?next=/account/orders");

  const orders = await getOrdersForUser(profile.id).catch(() => []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <UserAvatar
            fullName={profile.fullName}
            email={profile.email}
            avatarUrl={profile.avatarUrl}
            size={52}
          />
          <div className="min-w-0">
            <h1 className="text-3xl">My orders</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Kumusta{profile.fullName ? `, ${profile.fullName.split(" ")[0]}` : ""}! Here&apos;s
              everything you&apos;ve ordered.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Covers orders placed before signing in, or from another device. */}
          <Button asChild variant="outline" size="sm">
            <Link href="/track">
              <TruckIcon className="size-4" />
              Track Order
            </Link>
          </Button>
          <form action={signOut}>
            <Button type="submit" variant="outline" size="sm">
              <LogOutIcon className="size-4" />
              Sign out
            </Button>
          </form>
        </div>
      </header>

      {/* Account summary — confirms which identity the customer is signed in
          with, which matters when someone has both a Facebook and a Google
          account against different email addresses. */}
      <Card className="mt-6">
        <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-3 py-4">
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs font-bold tracking-widest uppercase">
              Name
            </p>
            <p className="truncate font-semibold">{profile.fullName ?? "Not set"}</p>
          </div>
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs font-bold tracking-widest uppercase">
              Email
            </p>
            <p className="truncate font-semibold">{profile.email ?? "Not set"}</p>
          </div>
          {profile.phone && (
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs font-bold tracking-widest uppercase">
                Phone
              </p>
              <p className="truncate font-semibold">{profile.phone}</p>
            </div>
          )}
          {profile.provider && (
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs font-bold tracking-widest uppercase">
                Signed in with
              </p>
              <p className="flex items-center gap-1.5 font-semibold">
                <ProviderIcon provider={profile.provider} />
                {PROVIDER_LABEL[profile.provider] ?? profile.provider}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {orders.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <ReceiptTextIcon className="text-muted-foreground size-12" />
            <div>
              <p className="font-display text-lg">Wala pang order</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Once you order, it shows up here.
              </p>
            </div>
            <Button asChild variant="brand">
              <Link href="/menu">Browse Menu</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/orders/${order.orderNumber}`}
                className="bg-card hover:bg-muted focus-visible:ring-ring flex items-center gap-4 rounded-xl border p-4 transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-base">#{order.orderNumber}</span>
                    <Badge variant={order.status === "READY" ? "success" : "navy"}>
                      {ORDER_STATUS_LABEL[order.status]}
                    </Badge>
                    <Badge variant="outline">{ORDER_TYPE_LABEL[order.orderType]}</Badge>
                  </div>
                  <p className="text-muted-foreground mt-1 truncate text-sm">
                    {order.itemSummary}
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {new Date(order.createdAt).toLocaleString("en-PH", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="font-display text-lg">{formatPeso(order.total)}</p>
                  <p className="text-muted-foreground text-xs">
                    {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
                  </p>
                </div>

                <ChevronRightIcon className="text-muted-foreground size-5 shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mb-safe-bar" />
    </div>
  );
}
