"use client";

import { useEffect } from "react";
import { prefetchMedia } from "@/lib/offline/prefetch";
import { cacheWorkout } from "@/lib/offline/workouts";
import { useConnectivityContext } from "@/lib/hooks/use-connectivity-context";

interface PlanDayExercise {
  exerciseId: string;
  workoutExerciseId: string;
  exerciseOrder: number;
  sets: number;
  reps: number | null;
  durationSeconds: number | null;
  restSeconds: number;
  name: string;
  animationUrl: string | null;
  instructions: string[] | null;
  exerciseMode: string;
}

interface PlanDayData {
  dayNumber: number;
  status: string;
  workoutId: string;
  workoutName: string;
  exercises: PlanDayExercise[];
  durationSeconds: number;
  estimatedCalories: number;
  description: string | null;
  slug: string;
}

export function PlanPagePrefetch({ days }: { days: PlanDayData[] }) {
  const { isOnline } = useConnectivityContext();

  useEffect(() => {
    if (!isOnline) return;

    const availableDays = days.filter((d) => d.status === "available");

    for (const day of availableDays) {
      cacheWorkout({
        workoutId: day.workoutId,
        name: day.workoutName,
        slug: day.slug,
        description: day.description,
        durationSeconds: day.durationSeconds,
        estimatedCalories: day.estimatedCalories,
        exercises: day.exercises.map((e) => ({
          workoutExerciseId: e.workoutExerciseId,
          exerciseId: e.exerciseId,
          exerciseOrder: e.exerciseOrder,
          sets: e.sets,
          reps: e.reps,
          durationSeconds: e.durationSeconds,
          restSeconds: e.restSeconds,
          name: e.name,
          animationUrl: e.animationUrl,
          instructions: e.instructions,
          exerciseMode: e.exerciseMode,
        })),
      });

      const animationUrls = day.exercises
        .filter((e) => e.animationUrl)
        .map((e) => e.animationUrl!);

      if (animationUrls.length > 0) {
        prefetchMedia(animationUrls);
      }
    }
  }, [days, isOnline]);

  return null;
}
