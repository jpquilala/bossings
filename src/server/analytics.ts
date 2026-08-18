import "server-only";
import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { cached, cacheDel } from "@/lib/cache";
import { captureException } from "@/lib/monitoring";
import {
  addDays,
  manilaDateKey,
  manilaDayStart,
  manilaMonthStart,
  manilaRange,
  manilaWeekStart,
} from "@/lib/timezone";

/**
 * Sales analytics for the admin dashboard.
 *
 * Two rules hold throughout:
 *
 * 1. **Money is Int centavos.** Sums stay integers; division happens only in
 *    `formatPeso` at render time. Never average then multiply back.
 * 2. **Days are Manila days.** Every window boundary comes from
 *    `src/lib/timezone.ts`, so a 1 AM order counts against the right date.
 *
 * "Revenue" means SUM(total) over non-cancelled orders — `total` is what the
 * stall actually banked, delivery fee included. The fee is also exposed
 * separately so the dashboard can show the split.
 */

const CANCELLED_EXCLUDED = { status: { not: "CANCELLED" } } as const;

export type PeriodTotals = {
  /** Centavos. */
  revenue: number;
  /** Centavos, before delivery fee. */
  subtotal: number;
  /** Centavos. */
  deliveryFee: number;
  orderCount: number;
  /** Centavos. 0 when there are no orders. */
  averageOrderValue: number;
};

export type SalesOverview = {
  today: PeriodTotals;
  yesterday: PeriodTotals;
  weekToDate: PeriodTotals;
  monthToDate: PeriodTotals;
  /** ISO timestamp, for the "updated N minutes ago" line. */
  generatedAt: string;
};

export type TrendPoint = {
  /** Manila calendar day, "YYYY-MM-DD". */
  date: string;
  /** Centavos. */
  revenue: number;
  orderCount: number;
};

export type SellerVariant = {
  variantId: string | null;
  label: string;
  units: number;
  /** Centavos. */
  revenue: number;
};

export type SellerRow = {
  /** productId, or `deleted:<name>` once the product row is gone. */
  key: string;
  productId: string | null;
  name: string;
  slug: string | null;
  /** null when the product has been deleted — no toggle can be offered. */
  isAvailable: boolean | null;
  units: number;
  /** Centavos. */
  revenue: number;
  variants: SellerVariant[];
};

export type SellersReport = {
  best: SellerRow[];
  worst: SellerRow[];
  /** Live products with zero sales in the window — the actionable signal. */
  neverSold: { id: string; name: string; slug: string; isAvailable: boolean }[];
  rangeDays: number;
  generatedAt: string;
};

export const EMPTY_PERIOD: PeriodTotals = {
  revenue: 0,
  subtotal: 0,
  deliveryFee: 0,
  orderCount: 0,
  averageOrderValue: 0,
};

/** Aggregate shape returned by prisma.order.aggregate below. */
type OrderAggregate = {
  _sum: { total: number | null; subtotal: number | null; deliveryFee: number | null };
  _count: { _all: number };
};

/**
 * `_sum` is null when no rows matched, so every field is coalesced. AOV is
 * derived from the summed totals rather than averaged per-row, which keeps it
 * exact in centavos.
 */
function toPeriodTotals(aggregate: OrderAggregate): PeriodTotals {
  const revenue = aggregate._sum.total ?? 0;
  const orderCount = aggregate._count._all;
  return {
    revenue,
    subtotal: aggregate._sum.subtotal ?? 0,
    deliveryFee: aggregate._sum.deliveryFee ?? 0,
    orderCount,
    averageOrderValue: orderCount > 0 ? Math.round(revenue / orderCount) : 0,
  };
}

function periodQuery(start: Date, end: Date) {
  return prisma.order.aggregate({
    where: { ...CANCELLED_EXCLUDED, createdAt: { gte: start, lt: end } },
    _sum: { total: true, subtotal: true, deliveryFee: true },
    _count: { _all: true },
  });
}

/** Today / yesterday / week-to-date / month-to-date, in Manila days. */
export async function getSalesOverview(now: Date = new Date()): Promise<SalesOverview> {
  const todayStart = manilaDayStart(now);
  const tomorrowStart = addDays(todayStart, 1);
  const yesterdayStart = addDays(todayStart, -1);

  const key = `analytics:overview:v1:${manilaDateKey(now)}`;

  return cached(key, 60, async () => {
    const [today, yesterday, weekToDate, monthToDate] = await prisma.$transaction([
      periodQuery(todayStart, tomorrowStart),
      periodQuery(yesterdayStart, todayStart),
      periodQuery(manilaWeekStart(now), tomorrowStart),
      periodQuery(manilaMonthStart(now), tomorrowStart),
    ]);

    return {
      today: toPeriodTotals(today),
      yesterday: toPeriodTotals(yesterday),
      weekToDate: toPeriodTotals(weekToDate),
      monthToDate: toPeriodTotals(monthToDate),
      generatedAt: new Date().toISOString(),
    };
  });
}

/**
 * Revenue per Manila day for the last `days` days.
 *
 * Raw SQL because Prisma's groupBy cannot group by a computed expression.
 * `created_at` is `timestamp WITHOUT time zone` holding UTC, so it is
 * reinterpreted as UTC before converting — a lone `AT TIME ZONE 'Asia/Manila'`
 * would shift every row by eight hours.
 */
export async function getRevenueTrend(
  days: 7 | 14 | 30 = 7,
  now: Date = new Date(),
): Promise<TrendPoint[]> {
  const { start, end } = manilaRange(days, now);
  const key = `analytics:trend:v1:${days}:${manilaDateKey(now)}`;

  return cached(key, 300, async () => {
    const rows = await prisma.$queryRaw<
      { date: string; revenue: bigint; order_count: bigint }[]
    >(Prisma.sql`
      SELECT
        to_char((created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila')::date, 'YYYY-MM-DD') AS date,
        COALESCE(SUM(total), 0)::bigint AS revenue,
        COUNT(*)::bigint AS order_count
      FROM orders
      WHERE status <> 'CANCELLED'
        AND created_at >= ${start}
        AND created_at < ${end}
      GROUP BY 1
      ORDER BY 1
    `);

    // BigInt would make JSON.stringify throw and break the cache round-trip.
    const byDate = new Map(
      rows.map((row) => [
        row.date,
        { revenue: Number(row.revenue), orderCount: Number(row.order_count) },
      ]),
    );

    // Days with no orders produce no row; without gap-filling the chart would
    // silently skip them and imply continuous trade.
    return Array.from({ length: days }, (_, index) => {
      const date = manilaDateKey(addDays(start, index));
      const hit = byDate.get(date);
      return {
        date,
        revenue: hit?.revenue ?? 0,
        orderCount: hit?.orderCount ?? 0,
      };
    });
  });
}

/** Products ranked by units sold over the last `days` Manila days. */
export async function getSellersReport(
  days = 30,
  options: { limit?: number } = {},
  now: Date = new Date(),
): Promise<SellersReport> {
  const limit = options.limit ?? 10;
  const { start, end } = manilaRange(days, now);
  const key = `analytics:sellers:v1:${days}:${limit}:${manilaDateKey(now)}`;

  return cached(key, 300, async () => {
    // Grouping by `name` as well as the ids keeps deleted products distinct:
    // productId is nullable (onDelete: SetNull), so without it every removed
    // product would collapse into one anonymous bucket.
    const grouped = await prisma.orderItem.groupBy({
      by: ["productId", "variantId", "name"],
      where: {
        order: { ...CANCELLED_EXCLUDED, createdAt: { gte: start, lt: end } },
      },
      _sum: { quantity: true, lineTotal: true },
    });

    const productIds = [
      ...new Set(grouped.map((row) => row.productId).filter((id): id is string => Boolean(id))),
    ];
    const variantIds = [
      ...new Set(grouped.map((row) => row.variantId).filter((id): id is string => Boolean(id))),
    ];

    const [products, variants, neverSold] = await Promise.all([
      productIds.length
        ? prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, name: true, slug: true, isAvailable: true },
          })
        : Promise.resolve([]),
      variantIds.length
        ? prisma.productVariant.findMany({
            where: { id: { in: variantIds } },
            select: { id: true, label: true },
          })
        : Promise.resolve([]),
      prisma.product.findMany({
        where: productIds.length ? { id: { notIn: productIds } } : {},
        select: { id: true, name: true, slug: true, isAvailable: true },
        orderBy: { name: "asc" },
      }),
    ]);

    const productById = new Map(products.map((product) => [product.id, product]));
    const variantLabelById = new Map(variants.map((variant) => [variant.id, variant.label]));

    const rowByKey = new Map<string, SellerRow>();

    for (const group of grouped) {
      const units = group._sum.quantity ?? 0;
      const revenue = group._sum.lineTotal ?? 0;
      const product = group.productId ? productById.get(group.productId) : undefined;
      const key = group.productId ?? `deleted:${group.name}`;

      let row = rowByKey.get(key);
      if (!row) {
        row = {
          key,
          productId: group.productId,
          // Prefer the live name; fall back to the purchase-time snapshot.
          name: product?.name ?? group.name,
          slug: product?.slug ?? null,
          isAvailable: product?.isAvailable ?? null,
          units: 0,
          revenue: 0,
          variants: [],
        };
        rowByKey.set(key, row);
      }

      row.units += units;
      row.revenue += revenue;

      const label = group.variantId
        ? (variantLabelById.get(group.variantId) ?? "Removed size")
        : "Standard";
      const existing = row.variants.find((v) => v.variantId === group.variantId);
      if (existing) {
        existing.units += units;
        existing.revenue += revenue;
      } else {
        row.variants.push({ variantId: group.variantId, label, units, revenue });
      }
    }

    const all = [...rowByKey.values()];
    for (const row of all) row.variants.sort((a, b) => b.units - a.units);

    const best = [...all].sort((a, b) => b.units - a.units || b.revenue - a.revenue);
    const worst = [...all].sort((a, b) => a.units - b.units || a.revenue - b.revenue);

    return {
      best: best.slice(0, limit),
      worst: worst.slice(0, limit),
      neverSold,
      rangeDays: days,
      generatedAt: new Date().toISOString(),
    };
  });
}

/**
 * Drops every analytics cache entry. Call after anything that changes the
 * numbers: a cancelled order, or a product going in/out of stock.
 */
export async function invalidateAnalyticsCache() {
  await cacheDel("analytics:");
}

/** Count of orders still moving through the kitchen. Not capped by any take. */
export async function getActiveOrderCount(): Promise<number> {
  try {
    return await prisma.order.count({
      where: { status: { notIn: ["COMPLETED", "CANCELLED"] } },
    });
  } catch (error) {
    captureException(error, { source: "getActiveOrderCount" });
    return 0;
  }
}
