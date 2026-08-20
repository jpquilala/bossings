"use client";

import * as React from "react";
import { RefreshCwIcon } from "lucide-react";
import { useLiveOrders } from "@/hooks/use-live-orders";
import {
  SoundToggle,
  readPreference,
  subscribeToPreference,
} from "@/components/admin/sound-toggle";
import { playChime, unlockChime } from "@/lib/chime";
import { cn } from "@/lib/utils";

/**
 * Mounts the realtime subscription and shows its state. Staff need to know at
 * a glance whether the queue they are looking at is actually live.
 */
export function LiveIndicator({ activeCount }: { activeCount?: number } = {}) {
  // Starts false so the server HTML and the first client render agree; the
  // saved preference is adopted immediately after mount via useSyncExternal-
  // Store, which is the hydration-safe way to read a browser-only value.
  const savedPreference = React.useSyncExternalStore(
    subscribeToPreference,
    readPreference,
    () => false,
  );
  const [override, setOverride] = React.useState<boolean | null>(null);
  const soundOn = override ?? savedPreference;
  const setSoundOn = setOverride;

  // Restore the saved preference after mount, so the server and first client
  // render agree.
  //
  // The toggle reflects what the user chose, NOT whether the AudioContext is
  // currently running. Every page load starts it suspended, and resuming
  // outside a user gesture fails -- so gating the toggle on unlockChime() made
  // a reload silently flip a staff member's "Sound on" back to off.
  React.useEffect(() => {
    if (!savedPreference) return;

    // Re-arm continuously rather than once. The AudioContext is a module-level
    // singleton that Chrome suspends whenever this tab is backgrounded -- and
    // the kitchen screen is usually not the focused tab. A one-shot listener
    // would arm it at mount and never again, so sound worked until the first
    // time someone looked away.
    const rearm = () => void unlockChime();
    const opts = { passive: true } as const;
    window.addEventListener("pointerdown", rearm, opts);
    window.addEventListener("keydown", rearm, opts);
    // Returning to the tab is itself the moment to restore audio.
    document.addEventListener("visibilitychange", rearm);
    window.addEventListener("focus", rearm);
    return () => {
      window.removeEventListener("pointerdown", rearm);
      window.removeEventListener("keydown", rearm);
      document.removeEventListener("visibilitychange", rearm);
      window.removeEventListener("focus", rearm);
    };
  }, [savedPreference]);

  const handleNewOrder = React.useCallback(() => {
    if (soundOn) playChime();
  }, [soundOn]);

  const { status } = useLiveOrders({ onNewOrder: handleNewOrder });

  // Safety net for polling mode. The realtime handler cannot fire when the
  // socket is down, so a growing order count is the only signal available.
  // Compared during render (not in an effect) so the very first paint after a
  // poll already has the correct baseline.
  const [lastCount, setLastCount] = React.useState(activeCount);
  if (activeCount !== undefined && activeCount !== lastCount) {
    const grew = lastCount !== undefined && activeCount > lastCount;
    setLastCount(activeCount);
    // Only in polling mode: in realtime mode the INSERT handler already
    // chimed, and doing both would double up.
    if (grew && soundOn && status !== "live") playChime();
  }

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
