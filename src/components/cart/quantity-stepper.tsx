"use client";

import { MinusIcon, PlusIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Large +/- stepper. Both buttons clear the 44px touch-target minimum. */
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  label = "Quantity",
  size = "md",
  disabled = false,
  className,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  label?: string;
  size?: "sm" | "md";
  disabled?: boolean;
  className?: string;
}) {
  const buttonSize = size === "md" ? "size-11" : "size-10";

  return (
    <div
      className={cn(
        "border-input bg-background inline-flex items-center rounded-lg border-2",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
        aria-label={`Decrease ${label.toLowerCase()}`}
        className={cn(
          buttonSize,
          "grid place-items-center rounded-l-md transition-colors",
          "hover:bg-muted focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-inset focus-visible:outline-none",
          "disabled:pointer-events-none disabled:opacity-35",
        )}
      >
        <MinusIcon className="size-4" />
      </button>

      <span
        aria-live="polite"
        aria-label={`${label}: ${value}`}
        className="min-w-9 text-center font-display text-base tabular-nums"
      >
        {value}
      </span>

      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
        aria-label={`Increase ${label.toLowerCase()}`}
        className={cn(
          buttonSize,
          "grid place-items-center rounded-r-md transition-colors",
          "hover:bg-muted focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-inset focus-visible:outline-none",
          "disabled:pointer-events-none disabled:opacity-35",
        )}
      >
        <PlusIcon className="size-4" />
      </button>
    </div>
  );
}
