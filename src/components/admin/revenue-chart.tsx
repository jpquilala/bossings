"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatPeso } from "@/lib/currency";
import type { TrendPoint } from "@/server/analytics";

/** Compact axis labels: 12500 centavos -> "P125", 1250000 -> "P12.5k". */
function compactPeso(centavos: number): string {
  const pesos = centavos / 100;
  if (pesos >= 1000) return `P${(pesos / 1000).toFixed(pesos >= 10000 ? 0 : 1)}k`;
  return `P${Math.round(pesos)}`;
}

/** "2026-08-18" -> "Aug 18" */
function shortDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  return parsed.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeMotionPreference(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function RevenueChart({ data }: { data: TrendPoint[] }) {
  // Recharts animates with JS, so the global prefers-reduced-motion CSS rule
  // does not reach it — the preference has to be read directly. matchMedia is
  // an external store, so it is subscribed to rather than mirrored into state.
  const reduceMotion = React.useSyncExternalStore(
    subscribeMotionPreference,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false, // assume motion is fine during SSR
  );

  const total = data.reduce((sum, point) => sum + point.revenue, 0);

  // With 30 points there is no room for every label on a phone.
  const tickInterval = data.length > 14 ? Math.floor(data.length / 6) : 0;

  return (
    <div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 20, bottom: 0, left: -12 }}>
            <defs>
              <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-chart-revenue)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--color-chart-revenue)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--color-chart-grid)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={shortDate}
              interval={tickInterval}
              minTickGap={16}
              padding={{ left: 8, right: 8 }}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
            />
            <YAxis
              tickFormatter={compactPeso}
              tickLine={false}
              axisLine={false}
              width={56}
              tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
            />
            <Tooltip
              cursor={{ stroke: "var(--color-chart-revenue)", strokeWidth: 1 }}
              contentStyle={{
                borderRadius: "0.75rem",
                border: "1px solid var(--color-border)",
                background: "var(--color-popover)",
                color: "var(--color-popover-foreground)",
                fontSize: "0.8125rem",
              }}
              labelFormatter={(label) => shortDate(String(label))}
              formatter={(value, _name, item) => {
                const centavos = typeof value === "number" ? value : 0;
                const orders = (item?.payload as TrendPoint | undefined)?.orderCount ?? 0;
                return [`${formatPeso(centavos)} · ${orders} orders`, "Revenue"];
              }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="var(--color-chart-revenue)"
              strokeWidth={2}
              fill="url(#revenueFill)"
              isAnimationActive={!reduceMotion}
              dot={data.length <= 14}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* The chart alone is not an accessible representation, so the same
          numbers are available as a table to screen readers. */}
      <table className="sr-only">
        <caption>
          Revenue by day, {data.length} days, total {formatPeso(total)}
        </caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Revenue</th>
            <th scope="col">Orders</th>
          </tr>
        </thead>
        <tbody>
          {data.map((point) => (
            <tr key={point.date}>
              <th scope="row">{shortDate(point.date)}</th>
              <td>{formatPeso(point.revenue)}</td>
              <td>{point.orderCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
