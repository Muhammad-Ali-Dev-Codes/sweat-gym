import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth-user";
import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import type { PlanDayWithWorkout } from "@/lib/types/database";
import { PlanDayDetail } from "./plan-day-detail";

type Props = {
  params: Promise<{ dayId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { dayId } = await params;
  return { title: `Plan day ${dayId}` };
}

export default async function PlanDayPage({ params }: Props) {
  const { dayId } = await params;
  const supabase = await createClient();
  const user = await getAuthUser(supabase);

  if (!user) redirect("/login");

  const { data: day, error } = await supabase
    .from("user_plan_days")
    .select(
      `*,
      user_plans!inner ( plan_duration_days, plan_templates ( name ) ),
      workouts (
        id, name, slug, description, duration_seconds, estimated_calories,
        workout_exercises (
          id, exercise_order, sets, reps, duration_seconds, rest_seconds,
          exercises (
            *,
            exercise_focus_areas ( focus_areas ( name, slug ) ),
            exercise_muscles ( muscle_id, is_primary, muscles ( name, slug ) )
          )
        )
      )`
    )
    .eq("id", dayId)
    .eq("user_plans.user_id", user.id)
    .single();

  if (error || !day) notFound();

  return <PlanDayDetail day={day as unknown as PlanDayWithWorkout} />;
}