"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Auth route error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center py-10 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="size-7" aria-hidden />
      </span>
      <h2 className="mt-5 text-xl font-extrabold text-foreground">
        Authentication error
      </h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Something went wrong during sign-in. Please try again.
      </p>
      <button
        onClick={reset}
        className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground transition-transform hover:scale-[1.02] active:scale-95"
      >
        Try again
      </button>
    </div>
  );
}
