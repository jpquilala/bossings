import { formatPeso } from "@/lib/currency";
import { cn } from "@/lib/utils";

/** Gold starburst price badge, echoing the tarpaulin menu. */
export function PriceBadge({
  centavos,
  className,
  size = "md",
}: {
  centavos: number;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={cn(
        "starburst bg-gold-gradient text-navy-900 grid place-items-center font-display leading-none shadow-lg",
        size === "md" ? "size-16 text-base" : "size-13 text-sm",
        className,
      )}
    >
      <span className="translate-y-px">{formatPeso(centavos)}</span>
    </span>
  );
}
