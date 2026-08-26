import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth-user";
import { redirect } from "next/navigation";
import { ExerciseLibraryClient } from "./exercise-library-client";

export const metadata = {
  title: "Exercise Library | SWEAT",
  description:
    "Browse exercises, filter by muscle group, difficulty, and equipment, and find the right movement for your workout.",
};

export default async function ExerciseLibraryPage() {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);

  if (!user) redirect("/login");

  return <ExerciseLibraryClient userId={user.id} />;
}
