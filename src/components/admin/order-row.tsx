"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircleIcon,
  ClockIcon,
  Loader2Icon,
  MapPinIcon,
  PhoneIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { updateOrderStatus } from "@/server/admin-actions";
import { formatPeso } from "@/lib/currency";
import {
  ORDER_STATUS_LABEL,
  ORDER_TYPE_LABEL,
  PAYMENT_METHOD_LABEL,
  type OrderStatus,
} from "@/types/order";
import type { AdminOrder } from "@/server/orders";
import { cn } from "@/lib/utils";

/** The status a staff member would normally move to next. */
const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  PENDING: "CONFIRMED",
  CONFIRMED: "PREPARING",
  PREPARING: "READY",
  READY: "COMPLETED",
};

const ALL_STATUSES: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "COMPLETED",
  "CANCELLED",
];

export function AdminOrderRow({ order }: { order: AdminOrder }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  // Optimistic status so the kitchen sees the change instantly.
  const [status, setStatus] = React.useState<OrderStatus>(order.status);

  // When the server sends a newer status (another staff member moved it, or
  // our own refresh landed), adopt it. Adjusting state during render is the
  // documented way to reset state on a prop change — React re-runs this
  // component immediately without committing the stale paint.
  const [lastServerStatus, setLastServerStatus] = React.useState(order.status);
  if (order.status !== lastServerStatus) {
    setLastServerStatus(order.status);
    setStatus(order.status);
  }

  async function move(next: OrderStatus) {
    if (pending || next === status) return;

    const previous = status;
    setStatus(next);
    setPending(true);
    setError(null);

    const result = await updateOrderStatus({ orderId: order.id, status: next }).catch(() => ({
      ok: false,
      error: "Network error. Please try again.",
    }));

    setPending(false);

    if (!result.ok) {
      setStatus(previous); // roll back
      setError(result.error ?? "Could not update the order.");
      return;
    }

    router.refresh();
  }

  const next = NEXT_STATUS[status];
  const isDone = status === "COMPLETED" || status === "CANCELLED";

  return (
    <Card className={cn(isDone && "opacity-70")}>
      <CardContent className="flex flex-col gap-4 pt-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display text-lg">#{order.orderNumber}</span>
              <Badge
                variant={
                  status === "READY"
                    ? "success"
                    : status === "CANCELLED"
                      ? "outline"
                      : "navy"
                }
              >
                {ORDER_STATUS_LABEL[status]}
              </Badge>
              <Badge variant="gold">{ORDER_TYPE_LABEL[order.orderType]}</Badge>
              <Badge variant="outline">{PAYMENT_METHOD_LABEL[order.paymentMethod]}</Badge>
            </div>

            <p className="mt-1.5 text-sm font-semibold">{order.customerName}</p>
            <a
              href={`tel:${order.phone}`}
              className="text-muted-foreground hover:text-brand-600 mt-0.5 inline-flex min-h-11 items-center gap-1.5 text-sm"
            >
              <PhoneIcon className="size-3.5" />
              {order.phone}
            </a>

            <p className="text-muted-foreground mt-0.5 text-xs">
              {new Date(order.createdAt).toLocaleString("en-PH", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          </div>

          <p className="font-display shrink-0 text-2xl">{formatPeso(order.total)}</p>
        </div>

        <ul className="bg-muted flex flex-col gap-1 rounded-lg p-3 text-sm">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-3">
              <span>
                <span className="font-semibold">{item.quantity}×</span> {item.name}
              </span>
              <span className="tabular-nums">{formatPeso(item.lineTotal)}</span>
            </li>
          ))}
        </ul>

        {order.orderType === "DELIVERY" && order.address && (
          <p className="flex items-start gap-2 text-sm">
            <MapPinIcon className="text-brand-600 mt-0.5 size-4 shrink-0" />
            {order.address}
          </p>
        )}

        {order.orderType === "ADVANCE_ORDER" && order.scheduledFor && (
          <p className="flex items-center gap-2 text-sm font-semibold">
            <ClockIcon className="text-brand-600 size-4 shrink-0" />
            Scheduled:{" "}
            {new Date(order.scheduledFor).toLocaleString("en-PH", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        )}

        {order.notes && (
          <p className="border-gold-500/40 bg-gold-300/20 rounded-lg border p-3 text-sm">
            <span className="font-semibold">Notes:</span> {order.notes}
          </p>
        )}

        {error && (
          <p
            role="alert"
            className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2 text-sm"
          >
            <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {next && (
            <Button variant="brand" onClick={() => move(next)} disabled={pending}>
              {pending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : null}
              Mark {ORDER_STATUS_LABEL[next]}
            </Button>
          )}

          <label className="ml-auto flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Set status</span>
            <select
              value={status}
              onChange={(event) => move(event.target.value as OrderStatus)}
              disabled={pending}
              aria-label={`Status for order ${order.orderNumber}`}
              className="border-input bg-background focus-visible:ring-ring h-11 rounded-lg border-2 px-3 text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none"
            >
              {ALL_STATUSES.map((option) => (
                <option key={option} value={option}>
                  {ORDER_STATUS_LABEL[option]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </CardContent>
    </Card>
  );
}
