import "server-only";
import { captureException } from "@/lib/monitoring";

/**
 * Node-runtime-only process guards. Kept in a separate module so the Edge
 * bundle never parses `process.on` — a runtime guard alone still trips
 * Turbopack's static check, because it cannot see that the branch is dead.
 * Imported dynamically from instrumentation.ts.
 */
export function registerProcessGuards() {
  /**
   * A database driver that rejects outside the awaited promise chain (Prisma's
   * pg adapter can do this when a connection drops mid-query) would otherwise
   * terminate the whole server process. Log it and keep serving — individual
   * requests still fail and are handled by their own try/catch.
   */
  process.on("uncaughtException", (error) => {
    captureException(error, { source: "uncaughtException" });
  });

  process.on("unhandledRejection", (reason) => {
    captureException(reason, { source: "unhandledRejection" });
  });
}
