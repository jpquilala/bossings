"use client";

import * as React from "react";
import { RefreshCwIcon } from "lucide-react";
import { useLiveOrders } from "@/hooks/use-live-orders";
import { SoundToggle, readPreference } from "@/components/admin/sound-toggle";
import { playChime, unlockChime } from "@/lib/chime";
import { cn } from "@/lib/utils";

/**
 * Mounts the realtime subscription and shows its state. Staff need to know at
 * a glance whether the queue they are looking at is actually live.
 */
export function LiveIndicator() {
  // Read localStorage lazily: touching it during render on the server would
  // break hydration, and a lazy initialiser runs only on the client.
  const [soundOn, setSoundOn] = React.useState(false);

  // The saved preference is applied after mount so the server and first client
  // render agree. Re-unlocking is required anyway -- a fresh page load starts
  // with a suspended AudioContext regardless of what was saved.
  React.useEffect(() => {
    if (!readPreference()) return;
    let cancelled = false;
    void unlockChime().then((ok) => {
      if (!cancelled && ok) setSoundOn(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleNewOrder = React.useCallback(() => {
    if (soundOn) playChime();
  }, [soundOn]);

  const { status } = useLiveOrders({ onNewOrder: handleNewOrder });

  const label =
    status === "live"
      ? "Live"
      : status === "polling"
        ? "Auto-refresh"
        : "Connecting…";

  return (
    <span className="inline-flex items-center gap-2">
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
          <RefreshCwIcon
            className={cn("size-3", status === "connecting" && "animate-spin")}
          />
        )}
        {label}
      </span>
      <SoundToggle enabled={soundOn} onChange={setSoundOn} />
    </span>
  );
}
