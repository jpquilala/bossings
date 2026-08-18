import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * OAuth callback. Exchanges the authorization code for a session, then upserts
 * the Profile row from the provider metadata on first sign-in.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const errorDescription = searchParams.get("error_description");

  const nextParam = searchParams.get("next");
  const next = nextParam?.startsWith("/") ? nextParam : "/";

  if (errorDescription) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(errorDescription)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=Missing%20authorization%20code`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=Sign%20in%20failed`);
  }

  const metadata = data.user.user_metadata ?? {};
  const fullName =
    (metadata.full_name as string | undefined) ?? (metadata.name as string | undefined) ?? null;
  const avatarUrl =
    (metadata.avatar_url as string | undefined) ?? (metadata.picture as string | undefined) ?? null;

  try {
    await prisma.profile.upsert({
      where: { id: data.user.id },
      create: { id: data.user.id, fullName, avatarUrl },
      // Never clobber an existing value with null from a provider that omits it.
      update: { fullName: fullName ?? undefined, avatarUrl: avatarUrl ?? undefined },
    });
  } catch (profileError) {
    // The session is valid even if the profile write fails; log and continue.
    console.error("[auth/callback] profile upsert failed", profileError);
  }

  // Vercel terminates TLS upstream, so trust the forwarded host when present.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocal = process.env.NODE_ENV === "development";

  if (!isLocal && forwardedHost) {
    return NextResponse.redirect(`https://${forwardedHost}${next}`);
  }
  return NextResponse.redirect(`${origin}${next}`);
}
