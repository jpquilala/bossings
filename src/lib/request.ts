import type { NextRequest } from "next/server";

/**
 * Best-effort client IP for rate limiting. Vercel sets x-forwarded-for; the
 * first entry is the original client.
 */
export function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
