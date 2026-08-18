/**
 * Manila (Asia/Manila) calendar helpers.
 *
 * The store trades in San Pablo City, so "today's sales" must mean a Manila
 * calendar day — not the server's day. Deploy targets (Vercel, and this
 * project's Supabase instance) run in UTC, so `new Date().setHours(0,0,0,0)`
 * yields 08:00 Manila and misfiles every order placed after midnight local.
 *
 * The Philippines has not observed DST since 1978, so Manila is a permanent
 * UTC+8. That makes fixed-offset arithmetic exact and removes any need for a
 * timezone library.
 *
 * Every function returns a real UTC instant, ready to hand to Prisma as a
 * `gte`/`lt` bound against `Order.createdAt`.
 */

export const MANILA_TZ = "Asia/Manila";
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Shift a UTC instant into a "pretend-UTC" Manila wall clock for date math. */
function toManilaWallClock(at: Date): Date {
  return new Date(at.getTime() + MANILA_OFFSET_MS);
}

/** The UTC instant of 00:00:00 Manila on the Manila day containing `at`. */
export function manilaDayStart(at: Date = new Date()): Date {
  const wall = toManilaWallClock(at);
  wall.setUTCHours(0, 0, 0, 0);
  return new Date(wall.getTime() - MANILA_OFFSET_MS);
}

/** Add whole days. Safe across month/year rollovers and unaffected by DST. */
export function addDays(at: Date, days: number): Date {
  return new Date(at.getTime() + days * DAY_MS);
}

/** The Manila calendar date of `at`, as "YYYY-MM-DD". Matches SQL bucket keys. */
export function manilaDateKey(at: Date): string {
  return toManilaWallClock(at).toISOString().slice(0, 10);
}

/**
 * A half-open window `[start, end)` covering the last `days` Manila days,
 * ending with (and including) today. `days = 7` spans today plus the six
 * days before it.
 */
export function manilaRange(days: number, now: Date = new Date()) {
  const todayStart = manilaDayStart(now);
  return {
    start: addDays(todayStart, -(days - 1)),
    end: addDays(todayStart, 1), // exclusive: covers all of today
  };
}

/** 00:00 Manila on Monday of the current Manila week. */
export function manilaWeekStart(at: Date = new Date()): Date {
  const wall = toManilaWallClock(at);
  // getUTCDay(): 0 = Sunday. Shift so Monday is day 0.
  const daysSinceMonday = (wall.getUTCDay() + 6) % 7;
  return addDays(manilaDayStart(at), -daysSinceMonday);
}

/** 00:00 Manila on the 1st of the current Manila month. */
export function manilaMonthStart(at: Date = new Date()): Date {
  const wall = toManilaWallClock(at);
  const firstWall = new Date(
    Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth(), 1, 0, 0, 0, 0),
  );
  return new Date(firstWall.getTime() - MANILA_OFFSET_MS);
}

/**
 * SQL fragment that converts `created_at` to a Manila calendar date.
 *
 * `created_at` is `timestamp WITHOUT time zone` holding a UTC value, so it
 * must first be reinterpreted as UTC and only then converted. A single
 * `AT TIME ZONE 'Asia/Manila'` would treat the stored value as already-Manila
 * and shift every row by eight hours.
 */
export const MANILA_DATE_SQL =
  "(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Manila')::date";
