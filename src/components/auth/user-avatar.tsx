"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Initials for the fallback, e.g. "Pao Quilala" -> "PQ".
 *
 * Falls back to the email's first character so there is always something to
 * show; a blank circle reads as a broken image rather than a person.
 */
export function initialsFor(fullName: string | null, email: string | null): string {
  const source = fullName?.trim();
  if (source) {
    const parts = source.split(/\s+/).filter(Boolean);
    const letters =
      parts.length === 1
        ? parts[0].slice(0, 2)
        : `${parts[0][0]}${parts[parts.length - 1][0]}`;
    return letters.toUpperCase();
  }
  const local = email?.trim();
  return local ? local[0].toUpperCase() : "?";
}

/**
 * Profile picture for a signed-in user, with an initials fallback.
 *
 * OAuth avatar URLs are signed and time-limited — Facebook's carry an `ext`
 * expiry parameter — so the image can start 404ing while the session is still
 * perfectly valid. `onError` swaps in initials instead of leaving a broken
 * image icon in the header.
 */
export function UserAvatar({
  fullName,
  email,
  avatarUrl,
  size = 32,
  className,
}: {
  fullName: string | null;
  email: string | null;
  avatarUrl: string | null;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = React.useState(false);
  const initials = initialsFor(fullName, email);

  // A new URL deserves a fresh attempt: reset during render rather than in an
  // effect so the retry happens before paint.
  const [lastUrl, setLastUrl] = React.useState(avatarUrl);
  if (avatarUrl !== lastUrl) {
    setLastUrl(avatarUrl);
    setFailed(false);
  }

  const showImage = Boolean(avatarUrl) && !failed;

  return (
    <span
      className={cn(
        "bg-brand-100 text-brand-700 relative grid shrink-0 place-items-center overflow-hidden rounded-full font-bold",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.4) }}
    >
      {showImage ? (
        <Image
          src={avatarUrl!}
          alt=""
          width={size}
          height={size}
          className="size-full object-cover"
          onError={() => setFailed(true)}
          // Provider avatars are small and already optimised; skipping the
          // optimiser avoids a round trip through /_next/image for 50px art.
          unoptimized
        />
      ) : (
        <span aria-hidden>{initials}</span>
      )}
    </span>
  );
}
