"use client";

import Link from "next/link";
import { BellIcon } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useOrderNotifications } from "@/hooks/use-order-notifications";
import { ORDER_STATUS_BLURB, ORDER_STATUS_LABEL } from "@/types/order";

export function NotificationBell() {
  const { orders, unreadCount, markAllRead } = useOrderNotifications();

  return (
    <Sheet
      onOpenChange={(open) => {
        // Opening the panel counts as reading the updates.
        if (!open) markAllRead();
      }}
    >
      <SheetTrigger
        aria-label={unreadCount > 0 ? `Order updates, ${unreadCount} unread` : "Order updates"}
        className="tap-target focus-visible:ring-gold-400 relative grid place-items-center rounded-lg text-current transition-colors hover:bg-black/5 focus-visible:ring-2 focus-visible:outline-none"
      >
        <BellIcon className="size-5" />
        {unreadCount > 0 && (
          <span className="bg-brand-600 dark:ring-navy-900 absolute top-2 right-2 size-2.5 rounded-full ring-2 ring-white" />
        )}
      </SheetTrigger>

      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-sm">
        <SheetHeader className="bg-brand-gradient text-white">
          <SheetTitle className="text-white">Order updates</SheetTitle>
          <SheetDescription className="text-white/85">
            Status of the orders you placed from this device.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-5">
          {orders.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No orders yet. Once you order, updates land here.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {orders.map((order) => (
                <li key={order.orderNumber}>
                  <Link
                    href={`/orders/${order.orderNumber}`}
                    className="border-border hover:bg-muted focus-visible:ring-ring flex items-start gap-3 rounded-xl border p-3 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  >
                    {order.status !== order.seenStatus && (
                      <span
                        aria-label="Unread update"
                        className="bg-brand-500 mt-1.5 size-2.5 shrink-0 rounded-full"
                      />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-display text-sm">#{order.orderNumber}</span>
                        <Badge variant={order.status === "READY" ? "success" : "navy"}>
                          {ORDER_STATUS_LABEL[order.status]}
                        </Badge>
                      </span>
                      <span className="text-muted-foreground mt-1 block text-sm">
                        {ORDER_STATUS_BLURB[order.status]}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
