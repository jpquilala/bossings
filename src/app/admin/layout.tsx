import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { getSessionProfile, isStaff } from "@/server/profile";

/** Analytics and the queue must never be served from a static cache. */
export const dynamic = "force-dynamic";

/**
 * Shared shell for the admin area: one role gate covering every /admin route,
 * plus the section tabs.
 *
 * This gate is UI only. Server Actions are public POST endpoints and Prisma
 * connects with a direct connection that bypasses RLS, so each action
 * (`updateOrderStatus`, `setProductAvailability`) re-checks `isStaff` itself.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getSessionProfile().catch(() => null);
  if (!profile) redirect("/login?next=/admin");

  if (!isStaff(profile.role)) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <ShieldAlertIcon className="text-destructive size-12" />
            <div>
              <h1 className="font-display text-xl">Staff access only</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                This account does not have staff permissions.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/">Back to home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <p className="text-muted-foreground mb-3 text-sm">
        Signed in as {profile.fullName ?? profile.email} ({profile.role})
      </p>
      <AdminTabs />
      <div className="mt-6">{children}</div>
      <div className="mb-safe-bar" />
    </div>
  );
}
