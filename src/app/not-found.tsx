import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SaucerMark } from "@/components/brand/logo";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
      <SaucerMark className="size-24 opacity-60" />
      <h1 className="mt-6 text-3xl">Naligaw ka yata, Bossing</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        We couldn&apos;t find that page. It may have flown away.
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button asChild variant="brand" size="lg">
          <Link href="/menu">Browse Menu</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}
