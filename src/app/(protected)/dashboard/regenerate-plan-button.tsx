"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Zap } from "lucide-react";
import { regeneratePlan } from "@/app/actions/plan";

export function RegeneratePlanButton({ label }: { label: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);

    const result = await regeneratePlan();

    if (!result.success) {
      setError(result.error ?? "Could not create a new plan.");
      setLoading(false);
      return;
    }

    router.push("/plan");
    router.refresh();
  }

  return (
    <div className="mt-7">
      <button
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-base font-bold text-black shadow-lg transition-transform duration-200 hover:scale-105 active:scale-95 disabled:opacity-60"
      >
        {loading ? (
          <>
            <Loader2 className="size-5 animate-spin" aria-hidden />
            Building plan…
          </>
        ) : (
          <>
            <Zap className="size-5 fill-black" aria-hidden />
            {label}
          </>
        )}
      </button>
      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
