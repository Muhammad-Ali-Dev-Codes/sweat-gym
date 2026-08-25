import { LandingPage } from "@/components/landing/landing-page";
import { getAuthUser } from "@/lib/supabase/auth-user";
import { createClient } from "@/lib/supabase/server";

export default async function RootPage() {
  const supabase = await createClient();
  const user = await getAuthUser(supabase);
  return <LandingPage isAuthenticated={Boolean(user)} />;
}
