import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { AdminOrderRow } from "@/components/admin/order-row";
import { LiveIndicator } from "@/components/admin/live-indicator";
import { StatTile } from "@/components/admin/stat-tile";
import { QueueFilter } from "@/components/admin/queue-filter";
import { getAdminOrders, getTodayStatusCounts } from "@/server/orders";
import { getActiveOrderCount, getSalesOverview, EMPTY_PERIOD } from "@/server/analytics";
import { formatPeso } from "@/lib/currency";
import { isDefaultSelection, parseQueueStatuses } from "@/lib/queue-filter";
import { ORDER_STATUS_VALUES, type OrderStatus } from "@/types/order";

export const metadata: Metadata = {
  title: "Kitchen queue",
  robots: { index: false, follow: false },
};

// The role gate, shell and `dynamic` live in src/app/admin/layout.tsx.

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  // `searchParams` is a Promise in Next 16. The value is validated against the
  // known statuses before it reaches Prisma.
  const { status: rawStatus } = await searchParams;
  const statuses = parseQueueStatuses(rawStatus);

  // Stats come from dedicated aggregates rather than being derived from the
  // order list: that list is scoped to today and to the selected statuses, so
  // counting over it would make the tiles move whenever the filter changed.
  // The aggregates also bucket by Manila days instead of server-local midnight.
  const [orders, counts, overview, activeCount] = await Promise.all([
    getAdminOrders(statuses).catch(() => []),
    getTodayStatusCounts().catch(
      () =>
        Object.fromEntries(ORDER_STATUS_VALUES.map((s) => [s, 0])) as Record<
          OrderStatus,
          number
        >,
    ),
    getSalesOverview().catch(() => ({
      today: EMPTY_PERIOD,
      yesterday: EMPTY_PERIOD,
      weekToDate: EMPTY_PERIOD,
      monthToDate: EMPTY_PERIOD,
      generatedAt: new Date().toISOString(),
    })),
    getActiveOrderCount(),
  ]);

  // Distinguishes "no orders at all today" from "the filter hid them all",
  // which need different guidance in the empty state.
  const todayTotal = Object.values(counts).reduce((sum, n) => sum + n, 0);

  // Today's date, in Manila, for the page subheading.
  const dayLabel = new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(new Date());

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl">Kitchen queue</h1>
            <LiveIndicator />
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Today&rsquo;s orders &middot; {dayLabel}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-3">
          <StatTile label="Active" value={String(activeCount)} />
          <StatTile label="Today" value={String(overview.today.orderCount)} />
          <StatTile label="Sales" value={formatPeso(overview.today.revenue)} />
        </div>
      </header>

      <QueueFilter selected={statuses} counts={counts} />

      <section className="mt-6" aria-labelledby="orders-heading">
        <h2 id="orders-heading" className="flex items-center gap-2 text-xl">
          Orders
          <Badge variant="default">{orders.length}</Badge>
        </h2>

        {orders.length === 0 ? (
          <p className="text-muted-foreground border-border mt-3 rounded-xl border border-dashed py-10 text-center text-sm">
            {statuses.length === 0
              ? "Pumili muna ng status para makita ang orders."
              : todayTotal === 0
                ? "Wala pang order ngayong araw. Enjoy the quiet, Bossing!"
                : isDefaultSelection(statuses)
                  ? "Walang pending order. Enjoy the quiet, Bossing!"
                  : "Walang order na tugma sa filter. Try adjusting it above."}
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-4">
            {orders.map((order) => (
              <li key={order.id}>
                <AdminOrderRow order={order} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
