import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RecentOrders } from "@/components/checkout/recent-orders";

export const metadata: Metadata = {
  title: "Track your order",
  description: "Check the status of your Bossing's Flying Saucer order.",
};

export default function TrackPage() {
  async function lookup(formData: FormData) {
    "use server";
    const orderNumber = String(formData.get("orderNumber") ?? "").trim().toUpperCase();
    if (orderNumber) redirect(`/orders/${encodeURIComponent(orderNumber)}`);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <header className="text-center">
        <h1 className="text-3xl">Track your order</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Enter the order number we gave you, e.g. BFS-240817-4821.
        </p>
      </header>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Order lookup</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={lookup} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="orderNumber">Order number</Label>
              <Input
                id="orderNumber"
                name="orderNumber"
                placeholder="BFS-240817-4821"
                required
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <Button type="submit" variant="brand" size="lg" className="w-full">
              <SearchIcon className="size-4" />
              Track Order
            </Button>
          </form>
        </CardContent>
      </Card>

      <RecentOrders />

      <div className="mb-safe-bar" />
    </div>
  );
}
