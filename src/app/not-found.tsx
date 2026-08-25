import Link from "next/link";
import { Flame } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 text-center font-[family-name:var(--font-geist-sans)]">
      <span className="grid size-14 place-items-center rounded-2xl bg-foreground">
        <Flame className="size-7 text-background" strokeWidth={2.5} aria-hidden />
      </span>
      <p className="mt-6 text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground">
        404 — Lost rep
      </p>
      <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
        This page doesn&apos;t exist.
      </h1>
      <p className="mt-3 max-w-sm text-sm text-muted-foreground sm:text-base">
        The page you&apos;re looking for was moved, removed, or never
        scheduled.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/dashboard"
          className="inline-flex h-12 items-center justify-center rounded-full bg-foreground px-8 text-sm font-bold text-background transition-transform hover:scale-[1.03] active:scale-95"
        >
          Go to Dashboard
        </Link>
        <Link
          href="/"
          className="inline-flex h-12 items-center justify-center rounded-full border border-border px-8 text-sm font-bold text-foreground transition-colors hover:bg-secondary active:scale-95"
        >
          Back Home
        </Link>
      </div>
    </div>
  );
}
