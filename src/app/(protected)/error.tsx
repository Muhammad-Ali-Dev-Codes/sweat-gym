"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";

export default function ProtectedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Protected route error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-10 text-center font-[family-name:var(--font-geist-sans)] sm:p-16">
      <span className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <RefreshCw className="size-7" aria-hidden />
      </span>
      <h1 className="mt-5 text-xl font-extrabold text-foreground">
        Something went wrong
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        An unexpected error occurred. Your data is safe — try refreshing this
        page.
      </p>
      <button
        onClick={reset}
        className="mt-7 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-foreground px-6 text-sm font-bold text-background transition-transform hover:scale-[1.02] active:scale-95"
      >
        <RefreshCw className="size-4" aria-hidden />
        Try again
      </button>
    </div>
  );
}
