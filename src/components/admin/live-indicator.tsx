"use client";

import { RefreshCwIcon } from "lucide-react";
import { useLiveOrders } from "@/hooks/use-live-orders";
import { cn } from "@/lib/utils";

/**
 * Mounts the realtime subscription and shows its state. Staff need to know at
 * a glance whether the queue they are looking at is actually live.
 */
export function LiveIndicator() {
  const { status } = useLiveOrders();

  const label =
    status === "live"
      ? "Live"
      : status === "polling"
        ? "Auto-refresh"
        : "Connecting…";

  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={
        status === "live"
          ? "Queue is live. New orders appear automatically."
          : status === "polling"
            ? "Live connection unavailable. Checking for new orders every 15 seconds."
            : "Connecting to live order updates."
      }
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
        status === "live" && "bg-emerald-600/10 text-emerald-700",
        status === "polling" && "bg-gold-500/20 text-navy-900",
        status === "connecting" && "bg-muted text-muted-foreground",
      )}
    >
      {status === "live" ? (
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-emerald-600" />
        </span>
      ) : (
        <RefreshCwIcon className={cn("size-3", status === "connecting" && "animate-spin")} />
      )}
      {label}
    </span>
  );
}
