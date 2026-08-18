import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The official brand crest. The artwork already contains the "Bossing's Flying
 * Saucer" wordmark, so nothing is rendered alongside it — the alt text carries
 * the name for screen readers and when images fail to load.
 */
export function Logo({
  className,
  priority = false,
}: {
  className?: string;
  /** Set on the header so the crest is not lazy-loaded above the fold. */
  priority?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {/* The full crest is far too detailed to read in a 44px app bar, so the
          compact lockup pairs the simple saucer glyph with type instead. The
          crest itself is used at hero/splash sizes via <LogoCrest>. */}
      <Image
        src="/brand/logo.webp"
        alt=""
        aria-hidden
        width={512}
        height={474}
        priority={priority}
        className="h-9 w-auto shrink-0 object-contain"
        sizes="36px"
      />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[0.6rem] tracking-[0.18em] text-gold-500 uppercase">
          Bossing&apos;s
        </span>
        <span className="font-display text-base leading-tight">
          Flying Saucer
        </span>
      </span>
      <span className="sr-only">Bossing&apos;s Flying Saucer</span>
    </span>
  );
}

/**
 * Icon-only saucer glyph, drawn as SVG.
 *
 * Deliberately not a crop of the crest: this is used at 32-96px for empty
 * states and image placeholders, where the detailed artwork turns to mush and
 * its rectangular aspect ratio does not fit a square slot. The vector stays
 * crisp at any size and inherits the surrounding colour.
 */
export function SaucerMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      role="img"
      aria-label="Bossing's Flying Saucer"
    >
      <defs>
        <linearGradient id="bfs-bun" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--gold-300)" />
          <stop offset="100%" stopColor="var(--gold-600)" />
        </linearGradient>
        <linearGradient id="bfs-plate" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>
      </defs>
      {/* speed rays */}
      <path
        d="M2 27h9M4 32h7M9 22h5"
        stroke="var(--brand-500)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* saucer plate */}
      <ellipse cx="25" cy="30" rx="18" ry="6" fill="url(#bfs-plate)" />
      <ellipse cx="25" cy="28.5" rx="18" ry="6" fill="#cbd5e1" />
      {/* toasted bun */}
      <path
        d="M8.5 27c0-7.5 7.4-13 16.5-13s16.5 5.5 16.5 13c0 2.6-7.4 4.4-16.5 4.4S8.5 29.6 8.5 27Z"
        fill="url(#bfs-bun)"
        stroke="var(--brand-700)"
        strokeWidth="1.6"
      />
      {/* crimped edge */}
      <path
        d="M9 27.4q2 1.6 4 0t4 0q2 1.6 4 0t4 0q2 1.6 4 0t4 0q2 1.6 4 0t4 0"
        stroke="var(--brand-700)"
        strokeWidth="1.3"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Full-size crest for hero and splash areas, where the detail is worth the
 * bytes. Uses the larger source render.
 */
export function LogoCrest({
  className,
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/brand/logo-large.webp"
      alt="Bossing's Flying Saucer"
      width={900}
      height={832}
      priority={priority}
      className={cn("h-auto w-full object-contain", className)}
      sizes="(min-width: 1024px) 420px, (min-width: 640px) 256px, 208px"
    />
  );
}
