"use client";

import * as React from "react";
import { Volume2Icon, VolumeXIcon } from "lucide-react";
import { playChime, unlockChime } from "@/lib/chime";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "bfs:queue-sound";

/** Reads the saved preference. Defaults to on — staff opted in by tapping. */
function readPreference(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "on";
  } catch {
    return false;
  }
}

/**
 * Arms the new-order chime.
 *
 * This exists as a visible control because browsers refuse to play audio until
 * the user has interacted with the page. A hidden "unlock on first click"
 * would leave staff with no way to tell whether the alert is actually armed,
 * and no way to mute it during a quiet period.
 */
export function SoundToggle({ enabled, onChange }: {
  enabled: boolean;
  onChange: (next: boolean) => void;
}) {
  const [blocked, setBlocked] = React.useState(false);

  async function toggle() {
    if (enabled) {
      onChange(false);
      persist(false);
      return;
    }

    // Must run inside the click handler: resuming the context outside a user
    // gesture is exactly what the autoplay policy blocks.
    const ok = await unlockChime();
    setBlocked(!ok);
    if (!ok) return;

    onChange(true);
    persist(true);
    playChime(); // Confirms it works, and tells staff what to listen for.
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={enabled}
        aria-label={enabled ? "Turn off new order sound" : "Turn on new order sound"}
        className={cn(
          "tap-target focus-visible:ring-ring inline-flex items-center gap-1.5 rounded-lg border-2 px-3 text-sm font-bold transition-colors focus-visible:ring-2 focus-visible:outline-none",
          enabled
            ? "border-emerald-600 bg-emerald-600/10 text-emerald-700"
            : "border-input text-muted-foreground hover:bg-muted",
        )}
      >
        {enabled ? (
          <Volume2Icon className="size-4" aria-hidden />
        ) : (
          <VolumeXIcon className="size-4" aria-hidden />
        )}
        {enabled ? "Sound on" : "Sound off"}
      </button>

      {blocked && (
        <p role="alert" className="text-destructive max-w-48 text-right text-xs">
          Your browser blocked audio. Check the site&rsquo;s sound permissions.
        </p>
      )}
    </div>
  );
}

function persist(on: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    // Private mode — the toggle still works for this session.
  }
}

export { STORAGE_KEY as SOUND_STORAGE_KEY, readPreference };
