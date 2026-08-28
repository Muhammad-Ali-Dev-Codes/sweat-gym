"use client";

import { MotionConfig } from "motion/react";

export function ReducedMotion({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
