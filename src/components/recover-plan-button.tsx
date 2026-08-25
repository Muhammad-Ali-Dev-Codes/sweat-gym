"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { recoverPlan } from "@/app/actions/plan";

/**
 * §21 Recovery affordance for an onboarded user whose active plan failed to
 * load. Rebuilds the plan from stored onboarding data — onboarding itself is
 * never restarted because of a missing plan.
 */
export function RecoverPlanButton({ label = "Restore my plan" }: { label?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);

    const result = await recoverPlan();

    if (!result.success) {
      setError(result.error ?? "Your plan could not be loaded. Please retry.");
      setLoading(false);
      return;
    }

    router.refresh();
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-600 to-orange-500 px-7 py-3 text-base font-bold text-white shadow-lg shadow-orange-600/30 transition-transform duration-200 hover:scale-[1.03] active:scale-95 disabled:opacity-60"
      >
        {loading ? (
          <>
            <Loader2 className="size-5 animate-spin" aria-hidden />
            Restoring…
          </>
        ) : (
          <>
            <RefreshCw className="size-5" aria-hidden />
            {label}
          </>
        )}
      </button>
      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
