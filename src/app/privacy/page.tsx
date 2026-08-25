import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — SWEAT",
  description: "How SWEAT collects, uses, and protects your personal data.",
};

export default function PrivacyPage() {
  return (
    <article className="prose prose-sm max-w-none font-[family-name:var(--font-geist-sans)] dark:prose-invert">
      <h1>Privacy Policy</h1>
      <p className="text-muted-foreground">
        <em>Last updated: August 2026</em>
      </p>

      <h2>1. Data We Collect</h2>
      <p>
        SWEAT collects the information you provide during signup and onboarding,
        including your name, age, gender, height, starting weight, and fitness
        goals. We also record workout sessions, weight measurements, and
        exercise completions as you use the app.
      </p>

      <h2>2. How We Use Your Data</h2>
      <p>Your data is used solely to:</p>
      <ul>
        <li>Generate and adjust your personalised training plan</li>
        <li>Track your progress and display charts</li>
        <li>Sync your data across devices</li>
        <li>Send push notifications you have opted into</li>
      </ul>

      <h2>3. Data Storage</h2>
      <p>
        All data is stored in a Supabase (PostgreSQL) database. Authenticated
        users can only access their own rows via row-level security policies.
        Offline data is stored locally in your browser using IndexedDB and
        synced when connectivity is restored.
      </p>

      <h2>4. Data Sharing</h2>
      <p>
        We do not sell, trade, or share your personal data with third parties.
        No analytics or advertising SDKs are included in the application.
      </p>

      <h2>5. Push Notifications</h2>
      <p>
        Push notifications are delivered via Web Push (VAPID). You may opt out
        at any time through your browser settings or the in-app notification
        preferences. Notification tokens are stored securely and never shared.
      </p>

      <h2>6. Data Deletion</h2>
      <p>
        You may permanently delete your account and all associated data from
        the Profile page. Deletion is irreversible and removes all records
        from our database within 30 days.
      </p>

      <h2>7. Security</h2>
      <p>
        We use industry-standard encryption in transit (TLS) and at rest.
        Access to your data is restricted to your authenticated session. The
        service role key is never exposed to the client.
      </p>

      <h2>8. Changes to This Policy</h2>
      <p>
        We may update this policy from time to time. Material changes will be
        communicated via in-app notification.
      </p>

      <h2>9. Contact</h2>
      <p>
        For privacy-related questions, contact us through the in-app feedback
        form or email <strong>privacy@sweat-app.com</strong>.
      </p>
    </article>
  );
}
