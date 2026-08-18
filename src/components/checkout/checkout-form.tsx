"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircleIcon,
  BikeIcon,
  CalendarClockIcon,
  Loader2Icon,
  ShoppingBagIcon,
  StoreIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/components/cart/cart-provider";
import { submitOrder, type CheckoutState } from "@/server/order-actions";
import { trackOrder } from "@/hooks/use-order-notifications";
import { formatPeso } from "@/lib/currency";
import { cn } from "@/lib/utils";
import type { OrderType, PaymentMethod } from "@/types/order";

const ORDER_TYPES: {
  value: OrderType;
  label: string;
  hint: string;
  icon: React.ElementType;
}[] = [
  // DINE_IN is deliberately absent: a customer already at the stall orders
  // over the counter, so routing them through checkout adds nothing. The
  // enum value survives in the database so older orders still render.
  { value: "TAKE_OUT", label: "Take Out", hint: "Pick up and go", icon: ShoppingBagIcon },
  {
    value: "ADVANCE_ORDER",
    label: "Advance Order",
    hint: "Schedule for later",
    icon: CalendarClockIcon,
  },
  { value: "DELIVERY", label: "Delivery", hint: "We bring it to you", icon: BikeIcon },
];

/** Cash is labelled by context: on pickup vs on delivery. */
function paymentOptions(orderType: OrderType) {
  const cashLabel = orderType === "DELIVERY" ? "Cash on Delivery" : "Cash on Pickup";
  return [
    { value: "CASH" as PaymentMethod, label: cashLabel, hint: "Pay when you receive it" },
    { value: "GCASH" as PaymentMethod, label: "GCash", hint: "We'll send the number to pay" },
  ];
}

export function CheckoutForm({
  defaultName,
  defaultPhone,
}: {
  defaultName: string;
  defaultPhone: string;
}) {
  const cart = useCart();
  const router = useRouter();

  const [customerName, setCustomerName] = React.useState(defaultName);
  const [phone, setPhone] = React.useState(defaultPhone);
  const [orderType, setOrderType] = React.useState<OrderType>("TAKE_OUT");
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>("CASH");
  const [address, setAddress] = React.useState("");
  const [scheduledDate, setScheduledDate] = React.useState("");
  const [scheduledTime, setScheduledTime] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [state, setState] = React.useState<CheckoutState | null>(null);

  const errorRef = React.useRef<HTMLDivElement>(null);

  // Today, in the local timezone — blocks picking a past date.
  const today = React.useMemo(() => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60_000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 10);
  }, []);

  const fieldErrors = state?.fieldErrors ?? {};

  React.useEffect(() => {
    if (state && !state.ok) errorRef.current?.focus();
  }, [state]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (pending || cart.items.length === 0) return;

    setPending(true);
    setState(null);

    const scheduledFor =
      orderType === "ADVANCE_ORDER" && scheduledDate && scheduledTime
        ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
        : null;

    const result = await submitOrder({
      customerName,
      phone,
      orderType,
      paymentMethod,
      address: orderType === "DELIVERY" ? address : null,
      scheduledFor,
      notes: cart.notes || null,
      items: cart.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
      })),
    }).catch(
      (): CheckoutState => ({
        ok: false,
        error: "Network error. Please check your connection and try again.",
      }),
    );

    setPending(false);

    if (result.ok && result.orderNumber) {
      trackOrder(result.orderNumber, "PENDING");
      cart.clear();
      router.push(`/orders/${result.orderNumber}?new=1`);
      return;
    }

    setState(result);
  }

  // The cart lives in localStorage, so the server renders an empty summary
  // while the client renders the real lines. Wait for hydration before
  // committing to either, rather than emitting markup that cannot match.
  if (!cart.hydrated) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-start">
        <div className="flex flex-col gap-6">
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
        <Skeleton className="h-96 rounded-xl" />
        <span className="sr-only" role="status">
          Loading your order
        </span>
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <Card className="mx-auto max-w-md text-center">
        <CardContent className="flex flex-col items-center gap-4 pt-6">
          <ShoppingBagIcon className="text-muted-foreground size-12" />
          <div>
            <h2 className="font-display text-xl">Your cart is empty</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Add a few flying saucers first, Bossing.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild variant="brand" size="lg">
              <Link href="/menu">Browse Menu</Link>
            </Button>
            {/* Someone landing here with an empty cart is often looking for an
                order they already placed. */}
            <Button asChild variant="outline" size="lg">
              <Link href="/track">Track an order</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-start">
      <div className="flex flex-col gap-6">
        {state && !state.ok && (
          <div
            ref={errorRef}
            tabIndex={-1}
            role="alert"
            className="border-destructive/40 bg-destructive/10 text-destructive flex items-start gap-2 rounded-xl border px-4 py-3 text-sm focus-visible:outline-none"
          >
            <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
            <p>{state.error}</p>
          </div>
        )}

        {/* ── Contact ── */}
        <Card>
          <CardHeader>
            <CardTitle>Your details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="customerName">Full name</Label>
              <Input
                id="customerName"
                name="customerName"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                autoComplete="name"
                required
                maxLength={80}
                aria-invalid={Boolean(fieldErrors.customerName)}
                aria-describedby={fieldErrors.customerName ? "customerName-error" : undefined}
              />
              {fieldErrors.customerName && (
                <p id="customerName-error" className="text-destructive text-sm">
                  {fieldErrors.customerName}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Mobile number</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                autoComplete="tel"
                placeholder="09171234567"
                required
                aria-invalid={Boolean(fieldErrors.phone)}
                aria-describedby={fieldErrors.phone ? "phone-error" : "phone-hint"}
              />
              {fieldErrors.phone ? (
                <p id="phone-error" className="text-destructive text-sm">
                  {fieldErrors.phone}
                </p>
              ) : (
                <p id="phone-hint" className="text-muted-foreground text-sm">
                  We&apos;ll text you when your order is ready.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Order type ── */}
        <Card>
          <CardHeader>
            <CardTitle>How do you want it?</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <RadioGroup
              value={orderType}
              onValueChange={(value) => setOrderType(value as OrderType)}
              aria-label="Order type"
              className="grid gap-2 sm:grid-cols-2"
            >
              {ORDER_TYPES.map((option) => (
                <Label
                  key={option.value}
                  htmlFor={`order-type-${option.value}`}
                  className={cn(
                    "flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition-colors",
                    orderType === option.value
                      ? "border-brand-600 bg-brand-50"
                      : "border-input hover:bg-muted",
                  )}
                >
                  <RadioGroupItem value={option.value} id={`order-type-${option.value}`} />
                  <option.icon
                    className={cn(
                      "size-5 shrink-0",
                      orderType === option.value ? "text-brand-600" : "text-muted-foreground",
                    )}
                  />
                  <span className="flex min-w-0 flex-col">
                    <span className="text-sm font-bold">{option.label}</span>
                    <span className="text-muted-foreground text-xs font-normal">
                      {option.hint}
                    </span>
                  </span>
                </Label>
              ))}
            </RadioGroup>

            {/* Advance Order — date + time */}
            {orderType === "ADVANCE_ORDER" && (
              <div className="border-brand-200 bg-brand-50/60 flex flex-col gap-3 rounded-xl border p-4">
                <p className="text-sm font-semibold">When should we have it ready?</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="scheduledDate">Date</Label>
                    <Input
                      id="scheduledDate"
                      type="date"
                      min={today}
                      value={scheduledDate}
                      onChange={(event) => setScheduledDate(event.target.value)}
                      required
                      aria-invalid={Boolean(fieldErrors.scheduledFor)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="scheduledTime">Time</Label>
                    <Input
                      id="scheduledTime"
                      type="time"
                      value={scheduledTime}
                      onChange={(event) => setScheduledTime(event.target.value)}
                      required
                      aria-invalid={Boolean(fieldErrors.scheduledFor)}
                      aria-describedby={
                        fieldErrors.scheduledFor ? "scheduledFor-error" : undefined
                      }
                    />
                  </div>
                </div>
                {fieldErrors.scheduledFor && (
                  <p id="scheduledFor-error" className="text-destructive text-sm">
                    {fieldErrors.scheduledFor}
                  </p>
                )}
              </div>
            )}

            {/* Delivery — address */}
            {orderType === "DELIVERY" && (
              <div className="border-brand-200 bg-brand-50/60 flex flex-col gap-2 rounded-xl border p-4">
                <Label htmlFor="address">Delivery address</Label>
                <Textarea
                  id="address"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="House/unit number, street, barangay, landmark"
                  maxLength={300}
                  required
                  aria-invalid={Boolean(fieldErrors.address)}
                  aria-describedby={fieldErrors.address ? "address-error" : "address-note"}
                />
                {fieldErrors.address && (
                  <p id="address-error" className="text-destructive text-sm">
                    {fieldErrors.address}
                  </p>
                )}
                <p id="address-note" className="text-muted-foreground text-sm">
                  Delivery fee depends on location. We will confirm before dispatch.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Payment ── */}
        <Card>
          <CardHeader>
            <CardTitle>Payment method</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={paymentMethod}
              onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
              aria-label="Payment method"
              className="grid gap-2 sm:grid-cols-2"
            >
              {paymentOptions(orderType).map((option) => (
                <Label
                  key={option.value}
                  htmlFor={`payment-${option.value}`}
                  className={cn(
                    "flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition-colors",
                    paymentMethod === option.value
                      ? "border-brand-600 bg-brand-50"
                      : "border-input hover:bg-muted",
                  )}
                >
                  <RadioGroupItem value={option.value} id={`payment-${option.value}`} />
                  <span className="flex min-w-0 flex-col">
                    <span className="text-sm font-bold">{option.label}</span>
                    <span className="text-muted-foreground text-xs font-normal">
                      {option.hint}
                    </span>
                  </span>
                </Label>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      </div>

      {/* ── Summary ── */}
      <Card className="lg:sticky lg:top-20">
        <CardHeader>
          <CardTitle>Order summary</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <ul className="flex flex-col gap-2.5">
            {cart.items.map((item) => (
              <li key={item.key} className="flex items-start justify-between gap-3 text-sm">
                <span className="min-w-0">
                  <span className="font-semibold">{item.quantity}×</span> {item.name}
                </span>
                <span className="shrink-0 tabular-nums">
                  {formatPeso(item.unitPrice * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <Separator />

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="tabular-nums">{formatPeso(cart.subtotal)}</span>
          </div>

          {orderType === "DELIVERY" && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Delivery fee</span>
              <span className="text-muted-foreground text-xs">Confirmed before dispatch</span>
            </div>
          )}

          <Separator />

          <div className="flex items-center justify-between">
            <span className="font-semibold">Total</span>
            <span className="font-display text-2xl">{formatPeso(cart.subtotal)}</span>
          </div>

          {cart.notes && (
            <p className="bg-muted text-muted-foreground rounded-lg p-3 text-sm">
              <span className="text-foreground font-semibold">Notes:</span> {cart.notes}
            </p>
          )}

          <Button
            type="submit"
            variant="brand"
            size="lg"
            disabled={pending || cart.items.length === 0}
            className="mt-1 w-full"
          >
            {pending ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                Placing order…
              </>
            ) : (
              <>
                <StoreIcon className="size-4" />
                Place Order
              </>
            )}
          </Button>

          <p className="text-muted-foreground text-center text-xs">
            After placing your order you can send it to us over SMS or Messenger.
          </p>
        </CardContent>
      </Card>
    </form>
  );
}
