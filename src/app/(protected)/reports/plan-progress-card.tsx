"use client";

import Link from "next/link";
import { CalendarDays, ChevronRight } from "lucide-react";
import { ProgressRing } from "@/components/ui/progress-ring";
import type { PlanProgressInfo } from "@/lib/reports/calculate";

type PlanProgressCardProps = {
  plan: PlanProgressInfo | null;
};

export function PlanProgressCard({ plan }: PlanProgressCardProps) {
  if (!plan || plan.totalDays === 0) {
    return (
      <section
        aria-label="Plan progress"
        className="titan-card flex flex-col items-start justify-center gap-3 p-5 sm:p-6"
      >
        <span className="flex size-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
          <CalendarDays className="size-4.5" aria-hidden />
        </span>
        <div>
          <h3 className="text-sm font-bold text-foreground">No active plan</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Start a personalized plan to track day-by-day progress here.
          </p>
        </div>
        <Link
          href="/plan"
          className="inline-flex items-center gap-1 text-sm font-bold text-foreground underline-offset-4 hover:underline"
        >
          Open Plan
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      </section>
    );
  }

  return (
    <section
      aria-label="Plan progress"
      className="titan-card p-5 sm:p-6"
    >
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
          <CalendarDays className="size-4.5" aria-hidden />
        </span>
        <div>
          <h3 className="text-sm font-bold text-foreground">Plan Progress</h3>
          <p className="text-xs text-muted-foreground">
            {plan.finished
              ? "Challenge complete"
              : `Day ${plan.nextDayNumber} of ${plan.totalDays}`}
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-5">
        <ProgressRing value={plan.percent} size={92} strokeWidth={9} color="energy" />
        <div className="min-w-0 space-y-2 text-sm font-semibold tabular-nums">
          <p className="text-foreground">
            <span className="text-xl font-black">{plan.completedDays}</span>{" "}
            <span className="text-muted-foreground">completed</span>
          </p>
          <p className="text-muted-foreground">
            {Math.max(0, plan.totalDays - plan.completedDays)} remaining
          </p>
          {plan.finished && (
            <Link
              href="/plan"
              className="inline-flex items-center gap-1 text-xs font-bold text-energy underline-offset-4 hover:underline"
            >
              Start a new challenge
              <ChevronRight className="size-3.5" aria-hidden />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
