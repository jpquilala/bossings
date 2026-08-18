import { TrendingDownIcon, TrendingUpIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A single KPI tile. Shared by the kitchen queue header and the dashboard so
 * both read identically.
 */
export function StatTile({
  label,
  value,
  hint,
  delta,
  className,
}: {
  label: string;
  value: string;
  /** Secondary line, e.g. the comparison period. */
  hint?: string;
  /** Percentage change vs the comparison period. Omit when not comparable. */
  delta?: number | null;
  className?: string;
}) {
  const hasDelta = typeof delta === "number" && Number.isFinite(delta);
  const up = hasDelta && delta > 0;
  const flat = hasDelta && delta === 0;

  return (
    <div className={cn("bg-card rounded-xl border px-4 py-3", className)}>
      <p className="text-muted-foreground text-xs font-bold tracking-wide uppercase">
        {label}
      </p>
      <p className="font-display mt-0.5 text-2xl leading-none">{value}</p>

      {hasDelta && (
        <p
          className={cn(
            "mt-1.5 flex items-center gap-1 text-xs font-semibold",
            flat && "text-muted-foreground",
            !flat && (up ? "text-emerald-700" : "text-destructive"),
          )}
        >
          {!flat &&
            (up ? (
              <TrendingUpIcon className="size-3.5" aria-hidden />
            ) : (
              <TrendingDownIcon className="size-3.5" aria-hidden />
            ))}
          {/* Sign is explicit so the direction survives without the icon. */}
          {flat ? "No change" : `${up ? "+" : ""}${delta.toFixed(0)}%`}
          {hint && <span className="text-muted-foreground font-normal">{hint}</span>}
        </p>
      )}

      {!hasDelta && hint && (
        <p className="text-muted-foreground mt-1.5 text-xs">{hint}</p>
      )}
    </div>
  );
}

/** Percentage change, or null when there is no meaningful baseline. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}
