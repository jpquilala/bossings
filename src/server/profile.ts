import "server-only";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/generated/prisma";

export type SessionProfile = {
  id: string;
  fullName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  role: Role;
  email: string | null;
};

/**
 * Current user + profile row. On first sign-in the profile is created from the
 * OAuth metadata, so callers can rely on it existing for a signed-in user.
 */
export async function getSessionProfile(): Promise<SessionProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const metadata = user.user_metadata ?? {};
  const fullName =
    (metadata.full_name as string | undefined) ??
    (metadata.name as string | undefined) ??
    null;
  const avatarUrl =
    (metadata.avatar_url as string | undefined) ??
    (metadata.picture as string | undefined) ??
    null;

  // Upsert keeps the profile in step with the provider without overwriting a
  // phone number the customer typed at checkout.
  const profile = await prisma.profile.upsert({
    where: { id: user.id },
    create: { id: user.id, fullName, avatarUrl },
    update: { fullName: fullName ?? undefined, avatarUrl: avatarUrl ?? undefined },
  });

  return {
    id: profile.id,
    fullName: profile.fullName,
    phone: profile.phone,
    avatarUrl: profile.avatarUrl,
    role: profile.role,
    email: user.email ?? null,
  };
}

export function isStaff(role: Role | undefined | null) {
  return role === "STAFF" || role === "ADMIN";
}
