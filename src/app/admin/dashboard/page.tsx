import type { Metadata } from "next";
import dynamicImport from "next/dynamic";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatTile, percentChange } from "@/components/admin/stat-tile";
import { SellersTable } from "@/components/admin/sellers-table";
import { RefreshButton } from "@/components/admin/refresh-button";
import { AvailabilityToggle } from "@/components/admin/availability-toggle";
import {
  EMPTY_PERIOD,
  getRevenueTrend,
  getSalesOverview,
  getSellersReport,
  type SalesOverview,
  type SellersReport,
  type TrendPoint,
} from "@/server/analytics";
import { formatPeso } from "@/lib/currency";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

/** Chart is client-only; skip it in the server bundle entirely. */
const RevenueChart = dynamicImport(
  () => import("@/components/admin/revenue-chart").then((m) => m.RevenueChart),
  { loading: () => <Skeleton className="h-64 w-full rounded-xl" /> },
);

const RANGES = [7, 14, 30] as const;
type Range = (typeof RANGES)[number];

function parseRange(value: string | undefined): Range {
  const parsed = Number(value);
  return (RANGES as readonly number[]).includes(parsed) ? (parsed as Range) : 7;
}

const EMPTY_OVERVIEW: SalesOverview = {
  today: EMPTY_PERIOD,
  yesterday: EMPTY_PERIOD,
  weekToDate: EMPTY_PERIOD,
  monthToDate: EMPTY_PERIOD,
  generatedAt: new Date().toISOString(),
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range: rawRange } = await searchParams;
  const range = parseRange(rawRange);

  // Each falls back independently so one failing query degrades a single card
  // rather than taking down the page.
  const [overview, trend, sellers] = await Promise.all([
    getSalesOverview().catch((): SalesOverview => EMPTY_OVERVIEW),
    getRevenueTrend(range).catch((): TrendPoint[] => []),
    getSellersReport(range).catch(
      (): SellersReport => ({
        best: [],
        worst: [],
        neverSold: [],
        rangeDays: range,
        generatedAt: new Date().toISOString(),
      }),
    ),
  ]);

  const revenueDelta = percentChange(overview.today.revenue, overview.yesterday.revenue);
  const orderDelta = percentChange(overview.today.orderCount, overview.yesterday.orderCount);

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl">Dashboard</h1>
        <RefreshButton generatedAt={overview.generatedAt} />
      </header>

      {/* ── KPIs ── */}
      <section aria-labelledby="kpi-heading" className="mt-6">
        <h2 id="kpi-heading" className="sr-only">
          Sales summary
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            label="Today"
            value={formatPeso(overview.today.revenue)}
            delta={revenueDelta}
            hint="vs yesterday"
          />
          <StatTile
            label="Orders today"
            value={String(overview.today.orderCount)}
            delta={orderDelta}
            hint="vs yesterday"
          />
          <StatTile
            label="Avg order"
            value={formatPeso(overview.today.averageOrderValue)}
            hint={`${overview.today.orderCount} order${overview.today.orderCount === 1 ? "" : "s"} today`}
          />
          <StatTile
            label="This month"
            value={formatPeso(overview.monthToDate.revenue)}
            hint={`${overview.monthToDate.orderCount} orders · week ${formatPeso(overview.weekToDate.revenue)}`}
          />
        </div>
      </section>

      {/* ── Trend ── */}
      <Card className="mt-6">
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle>Revenue trend</CardTitle>
          <nav aria-label="Trend range" className="bg-muted flex gap-1 rounded-lg p-1">
            {RANGES.map((option) => (
              <Link
                key={option}
                href={`/admin/dashboard?range=${option}`}
                aria-current={option === range ? "page" : undefined}
                className={cn(
                  "focus-visible:ring-ring flex min-h-11 min-w-11 items-center justify-center rounded-md px-3 text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:outline-none",
                  option === range
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option}d
              </Link>
            ))}
          </nav>
        </CardHeader>
        <CardContent>
          {trend.length === 0 ? (
            <p className="text-muted-foreground py-10 text-center text-sm">
              No sales data yet.
            </p>
          ) : (
            <RevenueChart data={trend} />
          )}
        </CardContent>
      </Card>

      {/* ── Sellers ── */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="best-heading">
          <h2 id="best-heading" className="text-xl">
            Best sellers
            <span className="text-muted-foreground ml-2 text-sm font-normal">
              last {range} days
            </span>
          </h2>
          <div className="mt-3">
            <SellersTable
              rows={sellers.best}
              emptyMessage="No sales in this period yet."
            />
          </div>
        </section>

        <section aria-labelledby="worst-heading">
          <h2 id="worst-heading" className="text-xl">
            Slowest movers
            <span className="text-muted-foreground ml-2 text-sm font-normal">
              last {range} days
            </span>
          </h2>
          <div className="mt-3">
            <SellersTable
              rows={sellers.worst}
              emptyMessage="Nothing to show yet."
            />
          </div>
        </section>
      </div>

      {/* ── Never sold: the genuinely actionable signal ── */}
      {sellers.neverSold.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>No sales in the last {range} days</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              {sellers.neverSold.map((product) => (
                <li
                  key={product.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-b pb-2 last:border-0 last:pb-0"
                >
                  <span className="font-semibold">{product.name}</span>
                  <AvailabilityToggle
                    productId={product.id}
                    name={product.name}
                    isAvailable={product.isAvailable}
                  />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </>
  );
}
