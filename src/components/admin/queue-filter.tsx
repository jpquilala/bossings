"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckIcon, RotateCcwIcon } from "lucide-react";
import {
  DEFAULT_QUEUE_STATUSES,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_VALUES,
  type OrderStatus,
} from "@/types/order";
import {
  QUEUE_STATUS_PARAM,
  isDefaultSelection,
  serializeQueueStatuses,
} from "@/lib/queue-filter";
import { cn } from "@/lib/utils";

/**
 * Status filter for the kitchen queue.
 *
 * The selection lives in the URL rather than component state. That matters
 * here specifically: the queue calls `router.refresh()` on every realtime
 * order event, and a filter held in local state would be fine — but a
 * bookmarked or shared URL would not reproduce the view, and a refresh
 * triggered mid-shift would be the only source of truth. Keeping it in the
 * query string makes the filtered queue linkable and survives navigation.
 *
 * Rendered as toggle buttons with `aria-pressed`, not checkboxes, because
 * each press navigates rather than editing a form to be submitted later.
 */
export function QueueFilter({
  selected,
  counts,
}: {
  selected: OrderStatus[];
  counts: Record<OrderStatus, number>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = React.useTransition();

  // Optimistic selection so a tap feels instant even though it is a
  // server round trip. The URL remains the source of truth: when new
  // searchParams arrive we adopt them, which also handles Back/Forward.
  const [optimistic, setOptimistic] = React.useState(selected);
  const selectedKey = selected.join(",");
  const [lastSelectedKey, setLastSelectedKey] = React.useState(selectedKey);
  if (selectedKey !== lastSelectedKey) {
    setLastSelectedKey(selectedKey);
    setOptimistic(selected);
  }

  function apply(next: OrderStatus[]) {
    setOptimistic(next);
    const params = new URLSearchParams(searchParams.toString());
    if (isDefaultSelection(next)) {
      // Keep the canonical view on a clean URL.
      params.delete(QUEUE_STATUS_PARAM);
    } else {
      params.set(QUEUE_STATUS_PARAM, serializeQueueStatuses(next));
    }
    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  }

  function toggle(status: OrderStatus) {
    apply(
      optimistic.includes(status)
        ? optimistic.filter((s) => s !== status)
        : [...optimistic, status],
    );
  }

  const isDefault = isDefaultSelection(optimistic);

  return (
    <section aria-labelledby="queue-filter-heading" className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="queue-filter-heading" className="text-muted-foreground text-xs font-bold tracking-widest uppercase">
          Filter by status
        </h2>
        {!isDefault && (
          <button
            type="button"
            onClick={() => apply([...DEFAULT_QUEUE_STATUSES])}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-bold focus-visible:ring-2 focus-visible:outline-none"
          >
            <RotateCcwIcon className="size-3.5" aria-hidden />
            Reset
          </button>
        )}
      </div>

      <div
        className={cn(
          "mt-2 flex flex-wrap gap-2 transition-opacity",
          pending && "opacity-60",
        )}
      >
        {ORDER_STATUS_VALUES.map((status) => {
          const active = optimistic.includes(status);
          const count = counts[status] ?? 0;
          return (
            <button
              key={status}
              type="button"
              onClick={() => toggle(status)}
              aria-pressed={active}
              className={cn(
                "focus-visible:ring-ring inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 px-3 text-sm font-bold transition-colors focus-visible:ring-2 focus-visible:outline-none",
                active
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-input text-muted-foreground hover:bg-muted",
              )}
            >
              {active && <CheckIcon className="size-3.5" aria-hidden />}
              {ORDER_STATUS_LABEL[status]}
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs tabular-nums",
                  active ? "bg-white/25" : "bg-muted text-muted-foreground",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Announced to screen readers on every change; the visible list above
          is a set of controls, so the result needs its own live region. */}
      <p aria-live="polite" className="sr-only">
        {optimistic.length === 0
          ? "No statuses selected. The queue is empty."
          : `Showing ${optimistic.map((s) => ORDER_STATUS_LABEL[s]).join(", ")}.`}
      </p>
    </section>
  );
}
