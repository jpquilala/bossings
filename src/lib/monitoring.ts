import { publicEnv } from "./env";

/**
 * Thin monitoring facade so Sentry can be switched on later without touching
 * call sites. Today it logs; once `@sentry/nextjs` is installed and
 * NEXT_PUBLIC_SENTRY_ENABLED="true", forward to Sentry from here.
 *
 *   npm install @sentry/nextjs
 *   // then, inside the enabled branch:
 *   // const Sentry = await import("@sentry/nextjs");
 *   // Sentry.captureException(error, { extra: context });
 */
export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (publicEnv.sentryEnabled && publicEnv.sentryDsn) {
    // Sentry hook goes here — see the note above.
  }
  console.error("[error]", error, context ?? "");
}

export function captureMessage(message: string, context?: Record<string, unknown>) {
  if (publicEnv.sentryEnabled && publicEnv.sentryDsn) {
    // Sentry hook goes here.
  }
  console.warn("[message]", message, context ?? "");
}

export const monitoringEnabled = publicEnv.sentryEnabled;
