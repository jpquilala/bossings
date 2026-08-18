"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, CircleDashedIcon, XCircleIcon } from "lucide-react";
import {
  ORDER_STATUS_BLURB,
  ORDER_STATUS_FLOW,
  ORDER_STATUS_LABEL,
  type OrderStatus,
} from "@/types/order";
import { trackOrder } from "@/hooks/use-order-notifications";
import { cn } from "@/lib/utils";

const POLL_MS = 20_000;

/** Live status tracker. Polls while the order is still in progress. */
export function OrderTracker({
  orderNumber,
  initialStatus,
}: {
  orderNumber: string;
  initialStatus: OrderStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = React.useState<OrderStatus>(initialStatus);

  // Remember this order locally so the bell can surface later updates.
  React.useEffect(() => {
    trackOrder(orderNumber, initialStatus);
  }, [orderNumber, initialStatus]);

  React.useEffect(() => {
    // Terminal states never change again — stop polling.
    if (status === "COMPLETED" || status === "CANCELLED") return;

    const interval = window.setInterval(async () => {
      try {
        const response = await fetch("/api/orders/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderNumbers: [orderNumber] }),
        });
        if (!response.ok) return;

        const data = (await response.json()) as {
          orders: { orderNumber: string; status: OrderStatus }[];
        };
        const next = data.orders[0]?.status;
        if (next && next !== status) {
          setStatus(next);
          trackOrder(orderNumber, next);
          router.refresh();
        }
      } catch {
        // Transient network failure — the next tick retries.
      }
    }, POLL_MS);

    return () => window.clearInterval(interval);
  }, [orderNumber, status, router]);

  if (status === "CANCELLED") {
    return (
      <div className="border-destructive/40 bg-destructive/10 flex items-start gap-3 rounded-xl border p-4">
        <XCircleIcon className="text-destructive mt-0.5 size-5 shrink-0" />
        <div>
          <p className="font-display text-base">Order cancelled</p>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {ORDER_STATUS_BLURB.CANCELLED}
          </p>
        </div>
      </div>
    );
  }

  const currentIndex = ORDER_STATUS_FLOW.indexOf(status);

  return (
    <div>
      <p aria-live="polite" className="bg-gold-300/25 border-gold-500/40 rounded-xl border px-4 py-3 font-medium">
        {ORDER_STATUS_BLURB[status]}
      </p>

      <ol className="mt-5 flex flex-col gap-0">
        {ORDER_STATUS_FLOW.map((step, index) => {
          const done = index < currentIndex;
          const current = index === currentIndex;
          const isLast = index === ORDER_STATUS_FLOW.length - 1;

          return (
            <li key={step} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full border-2 transition-colors",
                    done && "border-brand-600 bg-brand-600 text-white",
                    current && "border-brand-600 bg-brand-50 text-brand-600",
                    !done && !current && "border-input text-muted-foreground",
                  )}
                  aria-hidden
                >
                  {done ? (
                    <CheckIcon className="size-4" />
                  ) : current ? (
                    <CircleDashedIcon className="size-4 animate-spin [animation-duration:3s]" />
                  ) : (
                    <span className="bg-muted-foreground/40 size-2 rounded-full" />
                  )}
                </span>
                {!isLast && (
                  <span
                    className={cn("w-0.5 flex-1", done ? "bg-brand-600" : "bg-border")}
                    aria-hidden
                  />
                )}
              </div>

              <div className={cn("pb-6", isLast && "pb-0")}>
                <p
                  className={cn(
                    "font-semibold",
                    current && "text-brand-600",
                    !done && !current && "text-muted-foreground",
                  )}
                >
                  {ORDER_STATUS_LABEL[step]}
                  {current && <span className="sr-only"> — current status</span>}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
