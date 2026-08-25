"use client";

import { motion } from "motion/react";
import { Sparkles } from "lucide-react";
import type { Insight } from "@/lib/reports/insights";

export function InsightsCard({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) return null;

  return (
    <section
      aria-label="Insights"
      className="titan-card relative overflow-hidden p-5 sm:p-6"
    >
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="size-4.5" aria-hidden />
        </span>
        <div>
          <h3 className="text-sm font-bold text-foreground">Insights</h3>
          <p className="text-xs text-muted-foreground">
            Generated from your real numbers
          </p>
        </div>
      </div>

      <ul className="space-y-2.5">
        {insights.map((insight, i) => (
          <motion.li
            key={insight.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.06 }}
            className="flex items-start gap-2.5 rounded-xl bg-secondary/60 px-4 py-3 text-sm leading-relaxed text-foreground/90"
          >
            <span
              aria-hidden
              className="mt-[7px] size-1.5 shrink-0 rounded-full bg-energy"
            />
            {insight.text}
          </motion.li>
        ))}
      </ul>
    </section>
  );
}
