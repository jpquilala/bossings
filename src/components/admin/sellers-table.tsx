import { Badge } from "@/components/ui/badge";
import { AvailabilityToggle } from "@/components/admin/availability-toggle";
import { formatPeso } from "@/lib/currency";
import type { SellerRow } from "@/server/analytics";

/**
 * Ranked product list with CSS-width bars — no chart library and no client
 * JavaScript beyond the availability toggle itself.
 */
export function SellersTable({
  rows,
  emptyMessage,
}: {
  rows: SellerRow[];
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground border-border rounded-xl border border-dashed py-8 text-center text-sm">
        {emptyMessage}
      </p>
    );
  }

  // Bars are scaled against the strongest row so the ranking reads at a glance.
  const maxUnits = Math.max(...rows.map((row) => row.units), 1);

  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => (
        <li key={row.key} className="bg-card rounded-xl border p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display text-base">{row.name}</span>
                {row.isAvailable === false && <Badge variant="outline">Sold out</Badge>}
                {row.isAvailable === null && (
                  <Badge variant="outline" title="This product has been deleted">
                    Removed
                  </Badge>
                )}
              </div>

              <p className="text-muted-foreground mt-0.5 text-sm">
                {row.units} sold · {formatPeso(row.revenue)}
              </p>

              <div
                className="bg-muted mt-2 h-2 w-full overflow-hidden rounded-full"
                role="img"
                aria-label={`${row.units} units, ${formatPeso(row.revenue)}`}
              >
                <div
                  className="bg-brand-gradient h-full rounded-full"
                  style={{ width: `${Math.max(2, (row.units / maxUnits) * 100)}%` }}
                />
              </div>

              {/* Only worth showing when the product actually has sizes. */}
              {row.variants.length > 1 && (
                <ul className="text-muted-foreground mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  {row.variants.map((variant) => (
                    <li key={variant.variantId ?? "base"}>
                      <span className="font-semibold">{variant.label}</span> ·{" "}
                      {variant.units} sold · {formatPeso(variant.revenue)}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {row.productId && row.isAvailable !== null && (
              <AvailabilityToggle
                productId={row.productId}
                name={row.name}
                isAvailable={row.isAvailable}
              />
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
