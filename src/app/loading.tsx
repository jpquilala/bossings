import { SaucerMark } from "@/components/brand/logo";

export default function Loading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <SaucerMark className="animate-float size-20" />
      <p className="text-muted-foreground font-display text-sm">Loading…</p>
      <span className="sr-only" role="status">
        Loading content
      </span>
    </div>
  );
}
