"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import {
  Bell,
  CalendarCheck,
  CheckCheck,
  ChevronRight,
  Clock,
  Flame,
  Trophy,
  TrendingUp,
  Zap,
} from "lucide-react";
import { markReadAction, markAllReadAction, saveNotificationPreferences, subscribePushAction } from "@/app/actions/notifications";
import type { AppNotification } from "@/lib/types/database";
import { groupNotifications } from "@/lib/notifications/grouping";
import { PageHeader } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";

type Prefs = {
  workout_reminders: boolean;
  streak_reminders: boolean;
  achievement_alerts: boolean;
  progress_updates: boolean;
  recommendations: boolean;
  reminder_time: string;
};

type NotificationsClientProps = {
  initialPrefs: Prefs;
  initialNotifications: AppNotification[];
};

const CATEGORIES = [
  {
    icon: CalendarCheck,
    title: "Workout reminders",
    description: "A daily nudge at your chosen time so you never miss a session.",
    key: "workout_reminders" as const,
  },
  {
    icon: Flame,
    title: "Streak warnings",
    description: "Get alerted before an active streak is at risk.",
    key: "streak_reminders" as const,
  },
  {
    icon: Trophy,
    title: "Achievement alerts",
    description: "Celebrate every milestone the moment it unlocks.",
    key: "achievement_alerts" as const,
  },
  {
    icon: TrendingUp,
    title: "Progress updates",
    description: "Workout summaries and plan milestones.",
    key: "progress_updates" as const,
  },
  {
    icon: Bell,
    title: "Recommendations",
    description: "Occasional workout picks selected for you.",
    key: "recommendations" as const,
  },
];

const GROUP_ICONS: Record<AppNotification["type"], typeof Bell> = {
  workout_completed: Zap,
  streak_milestone: Flame,
  achievement: Trophy,
  plan_progress: TrendingUp,
  recommendation: Bell,
  system: Bell,
};

function formatNotificationTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffMin < 24 * 60) return `${Math.floor(diffMin / 60)}h ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Internal routes only — never navigate to foreign origins from a notification. */
function safeLink(link: string | null): string | null {
  if (!link || !link.startsWith("/") || link.startsWith("//")) return null;
  return link;
}

/** VAPID keys arrive as base64url; push subscriptions need raw bytes. */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-300 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        checked ? "bg-foreground" : "bg-muted"
      )}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 32 }}
        className={cn(
          "absolute size-5 rounded-full shadow-sm",
          checked ? "right-1 bg-background" : "left-1 bg-white"
        )}
      />
    </button>
  );
}

export function NotificationsClient({
  initialPrefs,
  initialNotifications,
}: NotificationsClientProps) {
  const router = useRouter();
  // Local timezone of the device is correct for grouping "Today".
  const timeZone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    []
  );
  const [prefs, setPrefs] = useState<Prefs>(initialPrefs);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [permission, setPermission] =
    useState<NotificationPermission>("default");

  const notifications = initialNotifications;
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  const groups = useMemo(
    () => groupNotifications(notifications, timeZone),
    [notifications, timeZone]
  );

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (typeof Notification !== "undefined") {
        setPermission(Notification.permission);
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  async function updatePref<K extends keyof Prefs>(key: K, value: Prefs[K]) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setSaving(true);
    setSaveError(null);

    const result = await saveNotificationPreferences(next);
    setSaving(false);
    if (!result.success) {
      setSaveError(result.error ?? "Could not save preferences");
      setPrefs(prefs); // revert on failure
    }
  }

  async function requestPermission() {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") void subscribeForPush();
  }

  /**
   * Register a push subscription when the server's VAPID public key is
   * configured. Without it, permission-only mode still enables local
   * reminders; real push delivery needs the key + backend sender.
   */
  async function subscribeForPush() {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return;
    }
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      const sub =
        existing ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        }));
      const json = sub.toJSON() as {
        endpoint?: string;
        keys?: { p256dh?: string; auth?: string };
      };
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;
      await subscribePushAction({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      });
    } catch {
      // Subscription failures must never block the UI.
    }
  }

  function handleMarkRead(id: string) {
    startTransition(async () => {
      await markReadAction(id);
      router.refresh();
    });
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      await markAllReadAction();
      router.refresh();
    });
  }

  function renderRow(n: AppNotification) {
    const Icon = GROUP_ICONS[n.type] ?? Bell;
    const unread = !n.read_at;
    const link = safeLink(n.link);

    const row = (
      <>
        <span
          className={cn(
            "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl",
            unread
              ? "bg-foreground text-background"
              : "bg-secondary text-muted-foreground"
          )}
        >
          <Icon className="size-4.5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span
              className={cn(
                "truncate text-sm",
                unread
                  ? "font-bold text-foreground"
                  : "font-semibold text-muted-foreground"
              )}
            >
              {n.title}
            </span>
            <span className="shrink-0 text-[11px] font-medium tabular-nums text-muted-foreground">
              {formatNotificationTime(n.created_at)}
            </span>
          </span>
          {n.body && (
            <span className="mt-0.5 block line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {n.body}
            </span>
          )}
        </span>
        {unread && (
          <span
            aria-label="Unread"
            className="mt-1.5 size-2 shrink-0 rounded-full bg-energy"
          />
        )}
        {link && (
          <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground/50" aria-hidden />
        )}
      </>
    );

    const className = cn(
      "flex w-full items-start gap-3.5 rounded-lg px-1.5 py-3.5 text-left transition-colors min-h-[56px]",
      unread ? "hover:bg-secondary/60" : "cursor-default opacity-80"
    );

    if (link) {
      return (
        <li key={n.id}>
          <Link
            href={link}
            onClick={() => {
              if (unread) handleMarkRead(n.id);
            }}
            className={className}
          >
            {row}
          </Link>
        </li>
      );
    }

    return (
      <li key={n.id}>
        <button
          type="button"
          onClick={() => unread && handleMarkRead(n.id)}
          disabled={!unread}
          className={className}
        >
          {row}
        </button>
      </li>
    );
  }

  return (
    <div className="font-[family-name:var(--font-geist-sans)]">
      <PageHeader
        title="Notifications"
        subtitle="Everything that matters about your training, in one feed."
        action={
          unreadCount > 0 ? (
            <button
              onClick={handleMarkAllRead}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs font-bold text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
            >
              <CheckCheck className="size-3.5" aria-hidden />
              Mark all read
            </button>
          ) : undefined
        }
      />

      {/* Activity feed */}
      <section aria-label="Activity feed" className="titan-card mb-4 p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="relative flex size-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
            <Bell className="size-4.5" aria-hidden />
            {unreadCount > 0 && (
              <motion.span
                key={unreadCount}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 20 }}
                aria-hidden
                className="absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full bg-energy px-1 text-[9px] font-black leading-4 text-white ring-2 ring-card tabular-nums"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </motion.span>
            )}
          </span>
          <div>
            <h2 className="text-sm font-bold text-foreground">Activity</h2>
            <p className="text-xs text-muted-foreground">
              {unreadCount > 0
                ? `${unreadCount} unread`
                : "You're all caught up"}
            </p>
          </div>
        </div>

        {groups.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-border px-6 py-10 text-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-secondary text-muted-foreground">
              <Bell className="size-5" aria-hidden />
            </span>
            <p className="mt-3 text-sm font-semibold text-foreground">
              Nothing here yet
            </p>
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
              Complete a workout or hit a streak milestone and it will show up
              here.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {groups.map((group) => (
              <div key={group.label}>
                <h3 className="mb-1 text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  {group.label}
                </h3>
                <ul className="-mx-1.5 divide-y divide-border">
                  {group.items.map(renderRow)}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Preferences */}
        <section
          aria-label="Notification preferences"
          className="titan-card p-5 sm:p-6"
        >
          <div className="mb-5 flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
              <Bell className="size-4.5" aria-hidden />
            </span>
            <div>
              <h2 className="text-sm font-bold text-foreground">Preferences</h2>
              <p className="text-xs text-muted-foreground">
                {saving ? "Saving…" : saveError ? "Not saved — try again" : "Saved automatically"}
              </p>
            </div>
          </div>

          {saveError && (
            <p role="alert" className="mb-3 text-xs font-medium text-red-600">
              {saveError}
            </p>
          )}

          <ul className="divide-y divide-border">
            {CATEGORIES.map(({ icon: Icon, title, description, key }) => (
              <li
                key={key}
                className="flex items-center gap-4 py-4 first:pt-0 last:pb-0"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground">{title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                </div>
                <Toggle
                  checked={prefs[key]}
                  onChange={(next) => updatePref(key, next)}
                  label={title}
                />
              </li>
            ))}
          </ul>

          {/* Reminder time */}
          <div className="mt-5 flex items-center gap-4 rounded-xl border border-border bg-secondary/40 p-4">
            <Clock className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            <label htmlFor="reminder-time" className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-foreground">
                Daily reminder time
              </span>
              <span className="block text-xs text-muted-foreground">
                Your local time for the workout nudge.
              </span>
            </label>
            <input
              id="reminder-time"
              type="time"
              value={prefs.reminder_time}
              onChange={(e) => {
                const value = e.target.value;
                if (/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
                  void updatePref("reminder_time", value);
                }
              }}
              className="h-10 shrink-0 rounded-lg border border-border bg-background px-3 text-sm font-bold tabular-nums text-foreground outline-none focus:border-foreground"
            />
          </div>

          {/* Browser push permission */}
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-secondary/60 p-4">
            <Bell className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0 flex-1 text-xs text-muted-foreground">
              {permission === "granted" ? (
                <>
                  Device notifications are{" "}
                  <span className="font-bold text-foreground">enabled</span> on
                  this browser.
                </>
              ) : permission === "denied" ? (
                <>
                  Device notifications are{" "}
                  <span className="font-bold text-foreground">blocked</span>.
                  Update your browser settings to allow them.
                </>
              ) : (
                "Allow device notifications to receive reminders here."
              )}
            </div>
            {permission === "default" && (
              <button
                onClick={requestPermission}
                className="shrink-0 rounded-full bg-foreground px-4 py-2 text-xs font-bold text-background transition-transform hover:scale-[1.03] active:scale-95"
              >
                Enable
              </button>
            )}
          </div>
        </section>

        {/* Info card + hero */}
        <section aria-label="About notifications" className="space-y-4">
          <div className="titan-card flex items-start gap-4 p-5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
              <Zap className="size-5" aria-hidden />
            </span>
            <div>
              <h3 className="text-sm font-bold text-foreground">Deep links</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Tap a notification to jump straight to your Reports, Plan, or
                next Workout.
              </p>
            </div>
          </div>

          <div className="titan-hero relative overflow-hidden rounded-2xl p-5 sm:p-6">
            <p className="relative text-sm font-medium leading-relaxed text-zinc-400">
              Consistency beats intensity.{" "}
              <span className="font-bold text-white">
                Reminders exist to protect your streak.
              </span>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
