/**
 * Every order status, in kitchen workflow order.
 *
 * Declared as a const tuple so it can drive both the `OrderStatus` type and
 * runtime validation of the queue's `?status=` parameter — the two can never
 * drift apart.
 */
export const ORDER_STATUS_VALUES = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "COMPLETED",
  "CANCELLED",
] as const;

export type OrderStatus = (typeof ORDER_STATUS_VALUES)[number];

/**
 * What the kitchen sees on arrival: the orders still needing action.
 * COMPLETED and CANCELLED are opt-in, since neither needs anything doing.
 */
export const DEFAULT_QUEUE_STATUSES: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
];

export type OrderType = "DINE_IN" | "TAKE_OUT" | "ADVANCE_ORDER" | "DELIVERY";
export type PaymentMethod = "CASH" | "GCASH";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PREPARING: "Preparing",
  READY: "Ready",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

/** Short Taglish line shown to the customer on the tracking page. */
export const ORDER_STATUS_BLURB: Record<OrderStatus, string> = {
  PENDING: "Sent na! Hinihintay lang naming ma-confirm.",
  CONFIRMED: "Confirmed na, Bossing! Papunta na sa grill.",
  PREPARING: "Ginagawa na — init pa!",
  READY: "Ready na! Sundo na, Bossing.",
  COMPLETED: "Salamat, Bossing! Sarap na lumilipad.",
  CANCELLED: "This order was cancelled. Message us if that looks wrong.",
};

/** Progress order for the tracker. CANCELLED sits outside the happy path. */
export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "COMPLETED",
];

export const ORDER_TYPE_LABEL: Record<OrderType, string> = {
  DINE_IN: "Dine In",
  TAKE_OUT: "Take Out",
  ADVANCE_ORDER: "Advance Order",
  DELIVERY: "Delivery",
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: "Cash",
  GCASH: "GCash",
};
