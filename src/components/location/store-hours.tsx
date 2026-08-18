"use client";

import * as React from "react";
import { CheckIcon, PencilIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DEFAULT_HOURS } from "@/lib/store";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "bfs.store-hours.v1";

type Hours = (typeof DEFAULT_HOURS)[number];

/** 24h "15:00" -> "3:00 PM" */
function formatTime(value: string) {
  const [hourText, minute] = value.split(":");
  const hour = Number(hourText);
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${minute} ${suffix}`;
}

/**
 * Store hours with inline editing for staff. Edits persist locally so the
 * stall can adjust them without a deploy; `canEdit` is driven by the role.
 */
/** The weekday never changes mid-session, so there is nothing to subscribe to. */
const subscribeNever = () => () => {};

/** Saved overrides, or the defaults. Returns defaults during SSR. */
function readHours(): Hours[] {
  if (typeof window === "undefined") return DEFAULT_HOURS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_HOURS;
    const parsed = JSON.parse(raw) as Hours[];
    return Array.isArray(parsed) && parsed.length === 7 ? parsed : DEFAULT_HOURS;
  } catch {
    return DEFAULT_HOURS;
  }
}

export function StoreHours({ canEdit }: { canEdit: boolean }) {
  // Lazy initialiser: the first client render already has the saved hours,
  // so no effect is needed to load them.
  const [hours, setHours] = React.useState<Hours[]>(readHours);
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState<Hours[]>(hours);

  // "Today" depends on the visitor's local weekday, which the server cannot
  // know. useSyncExternalStore returns -1 during SSR and the real index on the
  // client, so the highlight appears after hydration without a mismatch.
  // Weekday index 0=Sunday, but DEFAULT_HOURS starts on Monday.
  const todayIndex = React.useSyncExternalStore(
    subscribeNever,
    () => (new Date().getDay() + 6) % 7,
    () => -1,
  );

  function save() {
    setHours(draft);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // Non-fatal — the change still applies for this session.
    }
    setEditing(false);
  }

  function cancel() {
    setDraft(hours);
    setEditing(false);
  }

  function update(index: number, patch: Partial<Hours>) {
    setDraft((current) =>
      current.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)),
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl">Store hours</h2>
        {canEdit && !editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <PencilIcon className="size-4" />
            Edit
          </Button>
        )}
        {editing && (
          <div className="flex gap-2">
            <Button variant="brand" size="sm" onClick={save}>
              <CheckIcon className="size-4" />
              Save
            </Button>
            <Button variant="ghost" size="sm" onClick={cancel}>
              <XIcon className="size-4" />
              Cancel
            </Button>
          </div>
        )}
      </div>

      <ul className="mt-4 flex flex-col divide-y">
        {(editing ? draft : hours).map((entry, index) => (
          <li
            key={entry.day}
            className={cn(
              "flex flex-wrap items-center gap-3 py-3",
              !editing && index === todayIndex && "bg-gold-300/20 -mx-2 rounded-lg px-2",
            )}
          >
            <span className="flex min-w-24 items-center gap-2 text-sm font-semibold">
              {entry.day}
              {!editing && index === todayIndex && <Badge variant="gold">Today</Badge>}
            </span>

            {editing ? (
              <div className="flex flex-1 flex-wrap items-center gap-2">
                <Label
                  htmlFor={`closed-${entry.day}`}
                  className="flex items-center gap-1.5 text-sm font-normal"
                >
                  <input
                    id={`closed-${entry.day}`}
                    type="checkbox"
                    checked={entry.closed}
                    onChange={(event) => update(index, { closed: event.target.checked })}
                    className="accent-brand-600 size-4"
                  />
                  Closed
                </Label>

                {!entry.closed && (
                  <>
                    <Input
                      type="time"
                      value={entry.open}
                      aria-label={`${entry.day} opening time`}
                      onChange={(event) => update(index, { open: event.target.value })}
                      className="h-11 w-32"
                    />
                    <span className="text-muted-foreground text-sm">to</span>
                    <Input
                      type="time"
                      value={entry.close}
                      aria-label={`${entry.day} closing time`}
                      onChange={(event) => update(index, { close: event.target.value })}
                      className="h-11 w-32"
                    />
                  </>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground ml-auto text-sm">
                {entry.closed
                  ? "Closed"
                  : `${formatTime(entry.open)} — ${formatTime(entry.close)}`}
              </span>
            )}
          </li>
        ))}
      </ul>

      {canEdit && (
        <p className="text-muted-foreground mt-3 text-xs">
          Hours are stored on this device. Wire them to a settings table when you want them
          shared across staff.
        </p>
      )}
    </div>
  );
}
