import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { LogoCrest } from "@/components/brand/logo";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { EmailSignIn } from "@/components/auth/email-sign-in";
import { getUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Bossing's Flying Saucer to save your details and see past orders.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  // Only allow same-site redirects back into the app.
  const target = next?.startsWith("/") ? next : "/";

  const user = await getUser().catch(() => null);
  if (user) redirect(target);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-12">
      {/* The crest carries the wordmark, so the h1 is visually hidden rather
          than repeating the name underneath it. */}
      <LogoCrest priority className="max-w-[15rem]" />

      <h1 className="sr-only">Bossing&apos;s Flying Saucer</h1>
      <p className="font-display text-brand-600 mt-2 text-lg">Sarap na Lumilipad!</p>
      <p className="text-muted-foreground mt-3 text-center text-sm">
        Sign in to save your details and keep your order history.
      </p>

      <Card className="mt-6 w-full">
        <CardContent className="flex flex-col gap-4 pt-6">
          <OAuthButtons next={target} />

          <div className="flex items-center gap-3">
            <span className="bg-border h-px flex-1" />
            <span className="text-muted-foreground text-xs font-semibold uppercase">or</span>
            <span className="bg-border h-px flex-1" />
          </div>

          <Link
            href="/menu"
            className="text-brand-600 focus-visible:ring-ring inline-flex min-h-11 items-center justify-center rounded-lg text-sm font-semibold underline underline-offset-4 focus-visible:ring-2 focus-visible:outline-none"
          >
            Continue as guest
          </Link>

          <p className="text-muted-foreground text-center text-xs">
            Guest checkout needs no account — just your name and mobile number.
          </p>

          {/* Staff and admin accounts are created by an operator, so this is
              collapsed by default and kept out of the customer's way. */}
          <div className="mt-1 flex flex-col items-center border-t pt-3">
            <EmailSignIn next={target} />
          </div>
        </CardContent>
      </Card>

      <div className="mb-safe-bar" />
    </div>
  );
}
