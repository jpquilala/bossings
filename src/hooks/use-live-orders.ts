"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Polling cadence used when the realtime socket is unavailable. */
const FALLBACK_POLL_MS = 15_000;

export type LiveStatus = "connecting" | "live" | "polling";

/**
 * Keeps the kitchen queue current.
 *
 * Subscribes to Postgres changes on `orders` and calls router.refresh() so the
 * server component re-renders with fresh data. If the socket cannot connect
 * (blocked network, Realtime disabled on the project) it degrades to polling
 * rather than silently showing a stale queue — a missed order is worse than a
 * few extra requests.
 */
export function useLiveOrders({ onNewOrder }: { onNewOrder?: () => void } = {}) {
  const router = useRouter();
  const [status, setStatus] = React.useState<LiveStatus>("connecting");
  const [lastEventAt, setLastEventAt] = React.useState<number | null>(null);

  // Stable callback so the effect never resubscribes just because the router
  // object changed identity. (A ref assigned during render would be a
  // render-phase side effect; useCallback is the correct tool here.)
  const refresh = React.useCallback(() => router.refresh(), [router]);

  // Read through a ref inside the effect so `refresh` changing does not tear
  // down and rebuild the realtime channel.
  const refreshRef = React.useRef(refresh);
  React.useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  // Same reasoning as refreshRef: a caller passing an inline arrow must not
  // tear down and rebuild the realtime channel on every render.
  const onNewOrderRef = React.useRef(onNewOrder);
  React.useEffect(() => {
    onNewOrderRef.current = onNewOrder;
  }, [onNewOrder]);

  React.useEffect(() => {
    let cancelled = false;
    let poll: number | undefined;
    let subscribed = false;

    const startPolling = () => {
      if (poll !== undefined) return;
      setStatus("polling");
      poll = window.setInterval(() => refreshRef.current(), FALLBACK_POLL_MS);
    };

    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      // Supabase not configured — polling still keeps the queue moving.
      startPolling();
      return () => {
        if (poll !== undefined) window.clearInterval(poll);
      };
    }

    let channel: ReturnType<typeof supabase.channel> | undefined;

    /**
     * Realtime enforces RLS. The `orders` policies grant SELECT only to
     * authenticated staff, so the socket must carry the user's access token
     * BEFORE subscribing — otherwise it connects as `anon`, the channel still
     * reports SUBSCRIBED, and the server silently withholds every event.
     */
    async function connect() {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;

      const token = data.session?.access_token;
      if (!token) {
        // Not signed in — the page will redirect, but poll meanwhile.
        startPolling();
        return;
      }
      await supabase.realtime.setAuth(token);
      if (cancelled) return;

      channel = supabase
        .channel("kitchen-queue")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "orders" },
          (payload) => {
            if (cancelled) return;
            setLastEventAt(Date.now());
            // Only an INSERT is a new order. Without this check the alert
            // would also fire every time a staff member advanced a status,
            // which is five times per order and trains people to ignore it.
            if (payload.eventType === "INSERT") {
              onNewOrderRef.current?.();
            }
            refreshRef.current();
          },
        )
        .subscribe((state) => {
          if (cancelled) return;
          if (state === "SUBSCRIBED") {
            subscribed = true;
            setStatus("live");
            if (poll !== undefined) {
              window.clearInterval(poll);
              poll = undefined;
            }
          } else if (
            state === "CHANNEL_ERROR" ||
            state === "TIMED_OUT" ||
            state === "CLOSED"
          ) {
            subscribed = false;
            startPolling();
          }
        });
    }

    void connect();

    // If the socket never reports SUBSCRIBED, fall back rather than hang.
    // `subscribed` guards against clobbering a healthy connection: without it
    // this timer downgraded a live channel to polling after 8 seconds.
    const guard = window.setTimeout(() => {
      if (!cancelled && !subscribed) startPolling();
    }, 8000);

    return () => {
      cancelled = true;
      window.clearTimeout(guard);
      if (poll !== undefined) window.clearInterval(poll);
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  return { status, lastEventAt };
}
