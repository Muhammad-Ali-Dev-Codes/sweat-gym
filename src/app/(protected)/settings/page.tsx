import { redirect } from "next/navigation";

// Settings merged into the Profile page; kept as a redirect so old
// links and bookmarks keep working.
export default function SettingsPage() {
  redirect("/profile");
}
