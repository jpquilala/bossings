import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CheckCircle2Icon,
  ClockIcon,
  MapPinIcon,
  PhoneIcon,
  TruckIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { OrderTracker } from "@/components/checkout/order-tracker";
import { SendOrderButtons } from "@/components/checkout/send-order-buttons";
import { getOrderByNumber } from "@/server/orders";
import { buildOrderMessage } from "@/lib/order-message";
import { formatPeso } from "@/lib/currency";
import { ORDER_TYPE_LABEL, PAYMENT_METHOD_LABEL } from "@/types/order";
import { STORE } from "@/lib/store";

export const metadata: Metadata = {
  title: "Order status",
  robots: { index: false, follow: false },
};

// Always read the current status rather than serving a cached page.
export const dynamic = "force-dynamic";

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const { orderNumber } = await params;
  const { new: isNew } = await searchParams;

  // A lookup failure is not the same as "no such order": swallowing the error
  // would show "not found" for what is really an outage, and tell a customer
  // their order vanished. Let it surface to the error boundary instead.
  const order = await getOrderByNumber(orderNumber);
  if (!order) notFound();

  const message = buildOrderMessage({
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    phone: order.phone,
    orderType: order.orderType,
    paymentMethod: order.paymentMethod,
    address: order.address,
    scheduledFor: order.scheduledFor,
    notes: order.notes,
    items: order.items,
    total: order.total,
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {isNew === "1" && (
        <div className="border-gold-500/50 bg-gold-300/25 mb-6 flex items-start gap-3 rounded-xl border p-4">
          <CheckCircle2Icon className="text-brand-600 mt-0.5 size-6 shrink-0" />
          <div>
            <h1 className="font-display text-xl">Salamat, Bossing!</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Your order is in. Send it to us below so we can confirm it right away.
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-2xl">#{order.orderNumber}</CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">
              Placed{" "}
              {new Date(order.createdAt).toLocaleString("en-PH", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          </div>
          <Badge variant="navy">{ORDER_TYPE_LABEL[order.orderType]}</Badge>
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          <OrderTracker orderNumber={order.orderNumber} initialStatus={order.status} />

          <Separator />

          <div>
            <h2 className="font-display text-base">Your items</h2>
            <ul className="mt-3 flex flex-col gap-2">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-3 text-sm">
                  <span>
                    <span className="font-semibold">{item.quantity}×</span> {item.name}
                  </span>
                  <span className="shrink-0 tabular-nums">{formatPeso(item.lineTotal)}</span>
                </li>
              ))}
            </ul>

            <Separator className="my-3" />

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums">{formatPeso(order.subtotal)}</span>
            </div>
            {order.deliveryFee > 0 && (
              <div className="mt-1 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Delivery fee</span>
                <span className="tabular-nums">{formatPeso(order.deliveryFee)}</span>
              </div>
            )}
            <div className="mt-2 flex items-center justify-between">
              <span className="font-semibold">Total</span>
              <span className="font-display text-2xl">{formatPeso(order.total)}</span>
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              Payment: {PAYMENT_METHOD_LABEL[order.paymentMethod]}
              {order.orderType === "DELIVERY" &&
                " — delivery fee depends on location and is confirmed before dispatch."}
            </p>

            {/* Paying by GCash is the one case where the customer still has
                something to do, so the number belongs here rather than only on
                checkout — this is the page they keep open. */}
            {order.paymentMethod === "GCASH" && (
              <div className="border-gold-400 bg-gold-400/10 mt-4 rounded-xl border-2 p-4">
                <p className="font-display text-sm">Send your GCash payment</p>
                <dl className="mt-2 flex flex-wrap items-end gap-x-8 gap-y-2">
                  <div>
                    <dt className="text-muted-foreground text-xs font-bold tracking-widest uppercase">
                      GCash number
                    </dt>
                    <dd className="font-display text-xl tabular-nums">
                      {STORE.gcashDisplay}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs font-bold tracking-widest uppercase">
                      Amount
                    </dt>
                    <dd className="font-display text-xl tabular-nums">
                      {formatPeso(order.total)}
                    </dd>
                  </div>
                </dl>
                <p className="text-muted-foreground mt-3 text-xs">
                  Use <span className="font-semibold">#{order.orderNumber}</span> as the
                  reference, then send us the receipt. Kitchen starts once payment lands.
                </p>
              </div>
            )}
          </div>

          <Separator />

          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground text-xs font-bold tracking-wide uppercase">
                Contact
              </p>
              <p className="mt-1 font-semibold">{order.customerName}</p>
              <p className="text-muted-foreground">{order.phone}</p>
            </div>

            {order.orderType === "DELIVERY" && order.address && (
              <div>
                <p className="text-muted-foreground text-xs font-bold tracking-wide uppercase">
                  Deliver to
                </p>
                <p className="mt-1">{order.address}</p>
              </div>
            )}

            {order.orderType === "ADVANCE_ORDER" && order.scheduledFor && (
              <div>
                <p className="text-muted-foreground text-xs font-bold tracking-wide uppercase">
                  Scheduled for
                </p>
                <p className="mt-1 flex items-center gap-1.5">
                  <ClockIcon className="size-4" />
                  {new Date(order.scheduledFor).toLocaleString("en-PH", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              </div>
            )}

            {order.orderType !== "DELIVERY" && (
              <div>
                <p className="text-muted-foreground text-xs font-bold tracking-wide uppercase">
                  Pick up at
                </p>
                <p className="mt-1 flex items-start gap-1.5">
                  <MapPinIcon className="mt-0.5 size-4 shrink-0" />
                  {STORE.address}
                </p>
              </div>
            )}
          </div>

          {order.notes && (
            <p className="bg-muted rounded-lg p-3 text-sm">
              <span className="font-semibold">Notes:</span> {order.notes}
            </p>
          )}

          <Separator />

          <div>
            <h2 className="font-display text-base">Send your order</h2>
            <p className="text-muted-foreground mt-1 mb-3 text-sm">
              We confirm fastest over SMS or Messenger.
            </p>
            <SendOrderButtons message={message} />
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        {/* Works for guests too: the order number is the only thing needed to
            look an order up again, e.g. after closing the tab. */}
        <Button asChild variant="outline">
          <Link href="/track">
            <TruckIcon className="size-4" />
            Track another order
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/menu">Order again</Link>
        </Button>
        <Button asChild variant="ghost">
          <a href={`tel:+63${STORE.phoneDigits.slice(1)}`}>
            <PhoneIcon className="size-4" />
            Call the stall
          </a>
        </Button>
      </div>

      <div className="mb-safe-bar" />
    </div>
  );
}
