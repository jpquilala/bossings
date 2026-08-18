"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { captureException } from "@/lib/monitoring";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    captureException(error, { digest: error.digest });
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
      <AlertTriangleIcon className="text-brand-600 size-16" />
      <h1 className="mt-6 text-3xl">May nasira, Bossing</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Something went wrong on our end. Please try again.
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button variant="brand" size="lg" onClick={reset}>
          Try again
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}
