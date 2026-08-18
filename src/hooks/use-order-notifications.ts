"use client";

import * as React from "react";
import type { OrderStatus } from "@/types/order";

const STORAGE_KEY = "bfs.tracked-orders.v1";
const CHANGE_EVENT = "bfs:orders-changed";
const POLL_MS = 30_000;

export type TrackedOrder = {
  orderNumber: string;
  /** Status the customer has already seen — an unread dot appears on change. */
  seenStatus: OrderStatus;
  status: OrderStatus;
  updatedAt: string;
};

const EMPTY: TrackedOrder[] = [];

/**
 * localStorage is an external store, so it is read through
 * useSyncExternalStore rather than mirrored into state inside an effect.
 * `snapshot` is cached so repeated reads return a referentially stable value.
 */
let snapshot: TrackedOrder[] = EMPTY;
let snapshotRaw: string | null = null;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function getSnapshot(): TrackedOrder[] {
  const raw = readRaw();
  if (raw === snapshotRaw) return snapshot;

  snapshotRaw = raw;
  if (!raw) {
    snapshot = EMPTY;
    return snapshot;
  }
  try {
    const parsed = JSON.parse(raw) as TrackedOrder[];
    snapshot = Array.isArray(parsed) ? parsed : EMPTY;
  } catch {
    snapshot = EMPTY;
  }
  return snapshot;
}

/** The server has no localStorage — render as if nothing is tracked. */
function getServerSnapshot(): TrackedOrder[] {
  return EMPTY;
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  // `storage` fires when another tab writes, keeping tabs in sync.
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function write(orders: TrackedOrder[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  } catch {
    // Non-fatal — notifications are a convenience.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Remember an order so its status changes surface in the bell menu. */
export function trackOrder(orderNumber: string, status: OrderStatus) {
  if (typeof window === "undefined") return;

  const existing = getSnapshot();
  const previous = existing.find((order) => order.orderNumber === orderNumber);

  // Re-tracking an order we already know about must not silently mark it read.
  const seenStatus = previous ? previous.seenStatus : status;
  if (previous && previous.status === status) return;

  const rest = existing.filter((order) => order.orderNumber !== orderNumber);
  write(
    [
      { orderNumber, status, seenStatus, updatedAt: new Date().toISOString() },
      ...rest,
    ].slice(0, 10),
  );
}

/**
 * Polls the status of recent orders placed from this device. Guests have no
 * account, so local storage is what makes "track my order" work for them.
 */
export function useOrderNotifications() {
  const orders = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const refresh = React.useCallback(async () => {
    const stored = getSnapshot();
    if (stored.length === 0) return;

    try {
      const response = await fetch("/api/orders/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumbers: stored.map((o) => o.orderNumber) }),
      });
      if (!response.ok) return;

      const data = (await response.json()) as {
        orders: { orderNumber: string; status: OrderStatus }[];
      };
      const byNumber = new Map(data.orders.map((o) => [o.orderNumber, o.status]));

      let changed = false;
      const next = stored.map((order) => {
        const live = byNumber.get(order.orderNumber);
        if (!live || live === order.status) return order;
        changed = true;
        return { ...order, status: live, updatedAt: new Date().toISOString() };
      });

      // Only write when something actually moved, so we don't loop renders.
      if (changed) write(next);
    } catch {
      // Transient network failure — the next tick retries.
    }
  }, []);

  React.useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(interval);
  }, [refresh]);

  const unreadCount = orders.filter((order) => order.status !== order.seenStatus).length;

  const markAllRead = React.useCallback(() => {
    const stored = getSnapshot();
    if (stored.every((order) => order.seenStatus === order.status)) return;
    write(stored.map((order) => ({ ...order, seenStatus: order.status })));
  }, []);

  return { orders, unreadCount, markAllRead, refresh };
}
