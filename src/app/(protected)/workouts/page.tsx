import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth-user";
import { getCustomWorkouts } from "@/services/workout/custom";
import { CustomWorkoutsClient } from "./workouts-client";

export const metadata = {
  title: "Custom Workouts | SWEAT",
  description: "Build and start workouts from your exercise library.",
};

export default async function CustomWorkoutsPage() {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  if (!user) redirect("/login");
  const workouts = await getCustomWorkouts(user.id);
  return <CustomWorkoutsClient initialWorkouts={workouts} />;
}
