"use client";

import { useEffect } from "react";
import { cacheWorkout } from "@/lib/offline/workouts";
import { useConnectivityContext } from "@/lib/hooks/use-connectivity-context";

interface DiscoverWorkoutData {
  workoutId: string;
  name: string;
  slug: string;
  description: string | null;
  durationSeconds: number;
  estimatedCalories: number;
  exercises: {
    workoutExerciseId: string;
    exerciseId: string;
    exerciseOrder: number;
    sets: number;
    reps: number | null;
    durationSeconds: number | null;
    restSeconds: number;
    name: string;
    animationUrl: string | null;
    instructions: string[] | null;
    exerciseMode: string;
  }[];
}

export function DiscoverPagePrefetch({ workouts }: { workouts: DiscoverWorkoutData[] }) {
  const { isOnline } = useConnectivityContext();

  useEffect(() => {
    if (!isOnline) return;

    for (const workout of workouts) {
      cacheWorkout(workout);
    }
  }, [workouts, isOnline]);

  return null;
}
