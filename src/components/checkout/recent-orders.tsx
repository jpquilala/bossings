"use client";

import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useOrderNotifications } from "@/hooks/use-order-notifications";
import { ORDER_STATUS_LABEL } from "@/types/order";

/** Orders placed from this device — the guest equivalent of order history. */
export function RecentOrders() {
  const { orders } = useOrderNotifications();

  if (orders.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="font-display text-base">Recent orders from this device</h2>
      <ul className="mt-3 flex flex-col gap-2">
        {orders.map((order) => (
          <li key={order.orderNumber}>
            <Link
              href={`/orders/${order.orderNumber}`}
              className="border-border bg-card hover:bg-muted focus-visible:ring-ring flex min-h-14 items-center gap-3 rounded-xl border px-4 transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <span className="font-display flex-1 text-sm">#{order.orderNumber}</span>
              <Badge variant={order.status === "READY" ? "success" : "navy"}>
                {ORDER_STATUS_LABEL[order.status]}
              </Badge>
              <ChevronRightIcon className="text-muted-foreground size-4 shrink-0" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
