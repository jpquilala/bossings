import "server-only";
import { prisma } from "@/lib/prisma";
import { DEFAULT_QUEUE_STATUSES, ORDER_STATUS_VALUES } from "@/types/order";
import type { OrderStatus, OrderType, PaymentMethod } from "@/types/order";
import { addDays, manilaDayStart } from "@/lib/timezone";

export type OrderDetail = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  orderType: OrderType;
  paymentMethod: PaymentMethod;
  customerName: string;
  phone: string;
  address: string | null;
  scheduledFor: string | null;
  notes: string | null;
  subtotal: number;
  deliveryFee: number;
  total: number;
  createdAt: string;
  userId: string | null;
  items: { id: string; name: string; unitPrice: number; quantity: number; lineTotal: number }[];
};

/**
 * Looks an order up by its public order number. The number itself is the
 * capability that lets a guest track their order, so nothing sensitive beyond
 * what the customer already typed is exposed here.
 */
export async function getOrderByNumber(orderNumber: string): Promise<OrderDetail | null> {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { items: true },
  });

  if (!order) return null;

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    orderType: order.orderType,
    paymentMethod: order.paymentMethod,
    customerName: order.customerName,
    phone: order.phone,
    address: order.address,
    scheduledFor: order.scheduledFor?.toISOString() ?? null,
    notes: order.notes,
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    total: order.total,
    createdAt: order.createdAt.toISOString(),
    userId: order.userId,
    items: order.items.map((item) => ({
      id: item.id,
      name: item.name,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
    })),
  };
}

/** Orders belonging to a signed-in customer, newest first. */
export async function getOrdersForUser(userId: string) {
  const orders = await prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { items: true },
    take: 50,
  });

  return orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status as OrderStatus,
    orderType: order.orderType as OrderType,
    total: order.total,
    createdAt: order.createdAt.toISOString(),
    itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    itemSummary: order.items.map((item) => `${item.quantity}× ${item.name}`).join(", "),
  }));
}

/**
 * Kitchen queue for staff — today's Manila orders only.
 *
 * Scoped to a single Manila trading day on purpose: the queue is an operational
 * screen, not an archive. Yesterday's finished orders pushed today's work down
 * the page and made the list grow without bound. Historical figures live on the
 * dashboard, which aggregates across whatever range the user picks.
 *
 * `statuses` filters server-side rather than in the client so a busy day never
 * ships rows the staff member has filtered out.
 */
export async function getAdminOrders(
  // Defaults to the orders still needing action, matching the queue's own
  // default view — not to every status, which would make an argument-less
  // call quietly show finished orders too.
  statuses: OrderStatus[] = [...DEFAULT_QUEUE_STATUSES],
  now: Date = new Date(),
) {
  // Empty selection means "show nothing" — not "show everything". Prisma's
  // `in: []` already yields no rows, but returning early skips a pointless
  // round trip and makes the intent explicit.
  if (statuses.length === 0) return [];

  const dayStart = manilaDayStart(now);
  const dayEnd = addDays(dayStart, 1);

  const orders = await prisma.order.findMany({
    where: {
      createdAt: { gte: dayStart, lt: dayEnd },
      status: { in: statuses },
    },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  return orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status as OrderStatus,
    orderType: order.orderType as OrderType,
    paymentMethod: order.paymentMethod as PaymentMethod,
    customerName: order.customerName,
    phone: order.phone,
    address: order.address,
    scheduledFor: order.scheduledFor?.toISOString() ?? null,
    notes: order.notes,
    total: order.total,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
    })),
  }));
}

/**
 * Per-status counts for today's Manila orders.
 *
 * Deliberately independent of the active filter: the count beside "Completed"
 * must show how many completed orders exist today even while that status is
 * unticked, otherwise the badges would only ever describe what is already on
 * screen and give the staff member no reason to tick anything.
 */
export async function getTodayStatusCounts(
  now: Date = new Date(),
): Promise<Record<OrderStatus, number>> {
  const dayStart = manilaDayStart(now);
  const dayEnd = addDays(dayStart, 1);

  const grouped = await prisma.order.groupBy({
    by: ["status"],
    where: { createdAt: { gte: dayStart, lt: dayEnd } },
    _count: { _all: true },
  });

  // Seed every status at zero so the UI never has to handle a missing key.
  const counts = Object.fromEntries(
    ORDER_STATUS_VALUES.map((status) => [status, 0]),
  ) as Record<OrderStatus, number>;

  for (const row of grouped) {
    counts[row.status as OrderStatus] = row._count._all;
  }
  return counts;
}

export type AdminOrder = Awaited<ReturnType<typeof getAdminOrders>>[number];
export type CustomerOrder = Awaited<ReturnType<typeof getOrdersForUser>>[number];
