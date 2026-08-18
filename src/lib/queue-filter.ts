import {
  DEFAULT_QUEUE_STATUSES,
  ORDER_STATUS_VALUES,
  type OrderStatus,
} from "@/types/order";

/** Query-string key carrying the queue's status selection. */
export const QUEUE_STATUS_PARAM = "status";

/**
 * Sentinel for "nothing selected".
 *
 * An empty `?status=` is indistinguishable from an absent one once the browser
 * serialises it, and absent must mean "use the defaults". Without this,
 * unchecking every box would silently snap back to the default four.
 */
export const QUEUE_STATUS_NONE = "none";

const VALID = new Set<string>(ORDER_STATUS_VALUES);

/**
 * Turns `?status=` into a validated status list.
 *
 * Anything unrecognised is dropped rather than trusted — the value reaches a
 * database query, and a hand-edited URL must not be able to steer it. Absent
 * or entirely-invalid input falls back to the default working set.
 */
export function parseQueueStatuses(raw: string | string[] | undefined): OrderStatus[] {
  // Next gives an array when the key repeats (?status=A&status=B).
  const value = Array.isArray(raw) ? raw.join(",") : raw;
  if (value === undefined) return [...DEFAULT_QUEUE_STATUSES];
  if (value === QUEUE_STATUS_NONE) return [];

  const seen = new Set<OrderStatus>();
  for (const part of value.split(",")) {
    const token = part.trim().toUpperCase();
    if (VALID.has(token)) seen.add(token as OrderStatus);
  }

  // A URL naming only bogus statuses is treated as no instruction at all.
  if (seen.size === 0) return [...DEFAULT_QUEUE_STATUSES];

  // Return in canonical workflow order so the value is stable regardless of
  // the order the user happened to tick the boxes.
  return ORDER_STATUS_VALUES.filter((status) => seen.has(status));
}

/** Serialises a selection back into a `?status=` value. */
export function serializeQueueStatuses(statuses: OrderStatus[]): string {
  if (statuses.length === 0) return QUEUE_STATUS_NONE;
  return ORDER_STATUS_VALUES.filter((status) => statuses.includes(status)).join(",");
}

/** True when the selection is exactly the default working set. */
export function isDefaultSelection(statuses: OrderStatus[]): boolean {
  return (
    statuses.length === DEFAULT_QUEUE_STATUSES.length &&
    DEFAULT_QUEUE_STATUSES.every((status) => statuses.includes(status))
  );
}
