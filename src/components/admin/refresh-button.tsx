"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Manual refresh for the dashboard.
 *
 * The kitchen queue subscribes to realtime because a missed order costs a
 * sale; analytics deliberately does not. Re-running eight aggregate queries on
 * every status click would be pure waste for numbers nobody needs to the
 * second.
 */
export function RefreshButton({ generatedAt }: { generatedAt: string }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  // Rendered only after mount: a relative time computed on the server would
  // disagree with the client and trip a hydration mismatch.
  const [label, setLabel] = React.useState<string | null>(null);
  React.useEffect(() => {
    const update = () => {
      const seconds = Math.max(0, Math.round((Date.now() - new Date(generatedAt).getTime()) / 1000));
      if (seconds < 60) setLabel("just now");
      else if (seconds < 3600) setLabel(`${Math.floor(seconds / 60)} min ago`);
      else setLabel(`${Math.floor(seconds / 3600)} h ago`);
    };
    update();
    const timer = window.setInterval(update, 30_000);
    return () => window.clearInterval(timer);
  }, [generatedAt]);

  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground text-xs" aria-live="polite">
        {label ? `Updated ${label}` : null}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => startTransition(() => router.refresh())}
        disabled={pending}
      >
        <RefreshCwIcon className={cn("size-4", pending && "animate-spin")} aria-hidden />
        Refresh
      </Button>
    </div>
  );
}
