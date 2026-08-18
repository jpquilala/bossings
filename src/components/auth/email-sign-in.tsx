"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertCircleIcon, Loader2Icon, LockIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

/**
 * Email + password sign-in for staff and admin accounts. Customers use the
 * social buttons or guest checkout; these accounts are created by an operator,
 * so there is deliberately no self-service sign-up here.
 */
export function EmailSignIn({ next }: { next: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;

    setPending(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        // Don't reveal whether the address exists.
        setError("Incorrect email or password.");
        setPending(false);
        return;
      }

      // Refresh so the server components pick up the new session cookie.
      router.replace(next);
      router.refresh();
    } catch {
      setError("Sign in is unavailable right now. Please try again.");
      setPending(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none"
      >
        <LockIcon className="size-3.5" />
        Staff sign in
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-left">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
          disabled={pending}
          aria-invalid={Boolean(error)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
          disabled={pending}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "signin-error" : undefined}
        />
      </div>

      {error && (
        <p
          id="signin-error"
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2 text-sm"
        >
          <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}

      <Button type="submit" variant="brand" size="lg" disabled={pending} className="w-full">
        {pending ? (
          <>
            <Loader2Icon className="size-4 animate-spin" />
            Signing in…
          </>
        ) : (
          "Sign In"
        )}
      </Button>

      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setError(null);
        }}
        className="text-muted-foreground hover:text-foreground min-h-11 text-sm"
      >
        Back
      </button>
    </form>
  );
}
