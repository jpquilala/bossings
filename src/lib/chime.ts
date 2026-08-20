/**
 * Two-tone "new order" chime, synthesised with the Web Audio API.
 *
 * Generated rather than loaded from an .mp3 so there is no binary asset to
 * ship, nothing to 404, and no delay on the first play while a file downloads.
 *
 * Browsers suspend an AudioContext created before a user gesture, so callers
 * must invoke `unlock()` from inside a real click/tap first. That is a browser
 * autoplay rule, not something the app can opt out of.
 */

let context: AudioContext | null = null;

type WindowWithWebkitAudio = Window & {
  webkitAudioContext?: typeof AudioContext;
};

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (context) return context;

  const Ctor =
    window.AudioContext ?? (window as WindowWithWebkitAudio).webkitAudioContext;
  if (!Ctor) return null; // Very old browser — silence is an acceptable fallback.

  context = new Ctor();
  return context;
}

/**
 * Resumes the audio context from within a user gesture.
 *
 * Returns whether audio is now usable, so the UI can tell the difference
 * between "muted by choice" and "the browser will not allow it".
 */
export async function unlockChime(): Promise<boolean> {
  const ctx = getContext();
  if (!ctx) return false;
  try {
    if (ctx.state === "suspended") await ctx.resume();
    return ctx.state === "running";
  } catch {
    return false;
  }
}

/** One note of the chime. */
function tone(ctx: AudioContext, freq: number, startAt: number, duration: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  // A triangle wave carries over kitchen noise without the harshness of a
  // square wave, which gets grating over a long shift.
  osc.type = "triangle";
  osc.frequency.value = freq;

  // Ramp the envelope rather than switching gain instantly: an abrupt start or
  // stop produces an audible click.
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(0.22, startAt + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  osc.connect(gain).connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.02);
}

/**
 * Plays the rising two-note chime. Safe to call when audio is unavailable or
 * still locked — it simply does nothing.
 */
export function playChime() {
  const ctx = getContext();
  if (!ctx || ctx.state !== "running") return;

  const now = ctx.currentTime;
  // A perfect fourth (A5 -> D6) reads as "attention" rather than "error".
  tone(ctx, 880, now, 0.18);
  tone(ctx, 1174.66, now + 0.16, 0.3);
}
