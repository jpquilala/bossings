"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2Icon, Loader2Icon, XCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setProductAvailability } from "@/server/admin-actions";

/**
 * Sold-out switch for one product.
 *
 * Optimistic like the order-status control: flip immediately, roll back if the
 * server refuses. Adopting newer server state during render is React's
 * documented way to reset state on a prop change.
 */
export function AvailabilityToggle({
  productId,
  name,
  isAvailable,
}: {
  productId: string;
  name: string;
  isAvailable: boolean;
}) {
  const router = useRouter();
  const [available, setAvailable] = React.useState(isAvailable);
  const [lastServer, setLastServer] = React.useState(isAvailable);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (isAvailable !== lastServer) {
    setLastServer(isAvailable);
    setAvailable(isAvailable);
  }

  async function toggle() {
    if (pending) return;
    const previous = available;
    const next = !available;

    setAvailable(next);
    setPending(true);
    setError(null);

    const result = await setProductAvailability({
      productId,
      isAvailable: next,
    }).catch(() => ({ ok: false as const, error: "Network error. Please try again." }));

    setPending(false);

    if (!result.ok) {
      setAvailable(previous);
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant={available ? "outline" : "brand"}
        size="sm"
        onClick={toggle}
        disabled={pending}
        aria-pressed={!available}
        aria-label={
          available ? `Mark ${name} sold out` : `Mark ${name} back in stock`
        }
      >
        {pending ? (
          <Loader2Icon className="size-4 animate-spin" aria-hidden />
        ) : available ? (
          <XCircleIcon className="size-4" aria-hidden />
        ) : (
          <CheckCircle2Icon className="size-4" aria-hidden />
        )}
        {available ? "Sold out" : "Back in stock"}
      </Button>

      <span aria-live="polite" className="sr-only">
        {`${name} is ${available ? "available" : "sold out"}`}
      </span>

      {error && (
        <p role="alert" className="text-destructive max-w-48 text-right text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
