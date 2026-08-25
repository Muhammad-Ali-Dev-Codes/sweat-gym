import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BarChart3,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  Crown,
  Dumbbell,
  Flame,
  Heart,
  LayoutDashboard,
  Play,
  Smartphone,
  Star,
  Timer,
  TrendingUp,
  Trophy,
  UserPlus,
  WifiOff,
  X,
  Zap,
} from "lucide-react";
import { Reveal } from "@/components/layout/reveal";
import { PlayerShowcase } from "@/components/landing/player-showcase";
import { FireMark } from "@/components/brand/fire-mark";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    number: "01",
    icon: UserPlus,
    title: "Create your profile",
    description:
      "Tell us your goal, experience level, and what you can do today.",
    meta: "~2 minutes",
  },
  {
    number: "02",
    icon: CalendarDays,
    title: "Get your 30-day plan",
    description:
      "A day-by-day program matched to your level — durations, calories, and rest built in.",
    meta: "Generated instantly",
  },
  {
    number: "03",
    icon: TrendingUp,
    title: "Train and track",
    description:
      "Follow the guided player, check off sets, and watch every metric move.",
    meta: "Every single day",
  },
];

const SATISFACTION = [
  { value: "4.9/5", label: "Average member rating", icon: Star },
  { value: "92%", label: "Train 3+ times per week", icon: TrendingUp },
  { value: "87%", label: "Finish their 30-day plan", icon: Trophy },
];

const TESTIMONIALS = [
  {
    quote:
      "The plan removes all guesswork. I open the app, I know exactly what to do, and the streak keeps me honest.",
    name: "Marcus T.",
    detail: "Training consistently for 6 months",
  },
  {
    quote:
      "I've tried three fitness apps this year. This is the first one where the workout player doesn't get in my way.",
    name: "Priya S.",
    detail: "Beginner → Intermediate in 90 days",
  },
  {
    quote:
      "Seeing calories, minutes, and weight on one screen is weirdly motivating. The reports sold me.",
    name: "Daniel K.",
    detail: "Down 8 kg since starting",
  },
];

const TIERS = [
  {
    name: "Free",
    price: "$0",
    period: "/ month",
    tagline: "Everything you need to start moving.",
    cta: "Start free",
    featured: false,
    features: [
      { label: "Personalized 30-day plan", included: true },
      { label: "Guided workout player", included: true },
      { label: "Streaks & reminders", included: true },
      { label: "Basic progress stats", included: true },
      { label: "Advanced reports & trends", included: false },
      { label: "Custom plan builder", included: false },
    ],
  },
  {
    name: "Pro",
    price: "$6.99",
    period: "/ month",
    tagline: "For members serious about momentum.",
    cta: "Go Pro",
    featured: true,
    badge: "Most popular",
    features: [
      { label: "Everything in Free", included: true },
      { label: "Advanced reports & trends", included: true },
      { label: "Weight goals & tracking", included: true },
      { label: "Unlimited favorites", included: true },
      { label: "Custom plan builder", included: false },
      { label: "Priority support", included: false },
    ],
  },
  {
    name: "Pro Max",
    price: "$12.99",
    period: "/ month",
    tagline: "Your coach in your pocket.",
    cta: "Go Pro Max",
    featured: false,
    features: [
      { label: "Everything in Pro", included: true },
      { label: "Custom plan builder", included: true },
      { label: "Smart exercise swaps", included: true },
      { label: "Early access to new features", included: true },
      { label: "Priority support", included: true },
      { label: "Family sharing (3 seats)", included: true },
    ],
  },
];

const FAQS = [
  {
    question: "Do I need any equipment?",
    answer:
      "No. Your plan is generated from your profile, including whether you have access to dumbbells, bands, or just a mat. Bodyweight-only is a perfectly valid path.",
  },
  {
    question: "How long are the workouts?",
    answer:
      "Most sessions run between 15 and 45 minutes. Your plan balances short days and longer sessions across the week so recovery stays realistic.",
  },
  {
    question: "Does it work without internet?",
    answer:
      "Yes. SWEAT is an installable PWA — your plan and workouts are cached on your device, and progress syncs when you're back online.",
  },
  {
    question: "Can I change my plan later?",
    answer:
      "Absolutely. Retake the assessment anytime and SWEAT builds a fresh 30-day plan from your updated profile and goals.",
  },
  {
    question: "Is my data private?",
    answer:
      "Your profile, workouts, and body metrics belong to you. Delete your account at any time from Settings and everything is removed.",
  },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold uppercase tracking-[0.3em] text-energy">
      {children}
    </p>
  );
}

/* ---------- Bento card visuals (pure CSS) ---------- */

function PlanWeekVisual() {
  const days = ["S", "M", "T", "W", "T", "F", "S"];
  return (
    <div className="mt-6 flex items-end justify-between gap-2" aria-hidden>
      {days.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-1.5">
          <span
            className={cn(
              "grid size-9 place-items-center rounded-xl text-xs font-extrabold sm:size-11",
              i < 4 && "bg-foreground text-background",
              i === 4 && "bg-energy text-energy-foreground shadow-lg shadow-energy/40",
              i > 4 && "border border-border bg-secondary text-muted-foreground"
            )}
          >
            {i < 4 ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
          </span>
          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
            {d}
          </span>
        </div>
      ))}
    </div>
  );
}

function BarsVisual() {
  const bars = [34, 52, 41, 68, 58, 86, 74];
  return (
    <div className="mt-6 flex h-16 items-end gap-1.5" aria-hidden>
      {bars.map((h, i) => (
        <div
          key={i}
          className={cn(
            "flex-1 rounded-t-md",
            i === 5 ? "bg-energy" : "bg-foreground/85"
          )}
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

export function LandingPage({
  isAuthenticated = false,
}: {
  isAuthenticated?: boolean;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-background font-[family-name:var(--font-geist-sans)]">
      {/* ================= Header ================= */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            aria-label="SWEAT home"
            className="flex items-center gap-2.5 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="grid size-8 place-items-center rounded-lg bg-foreground">
              <FireMark className="size-4 text-background" />
            </span>
            <span className="text-base font-extrabold tracking-widest text-foreground">
              SWEAT
            </span>
          </Link>

          <nav
            aria-label="Landing sections"
            className="hidden items-center gap-7 md:flex"
          >
            {[
              { href: "#features", label: "Features" },
              { href: "#how", label: "How it works" },
              { href: "#testimonials", label: "Stories" },
              { href: "#pricing", label: "Pricing" },
              { href: "#faq", label: "FAQ" },
            ].map(({ href, label }) => (
              <a
                key={href}
                href={href}
                className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                {label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2 text-sm font-bold text-background shadow-sm transition-transform hover:scale-[1.04] active:scale-95"
              >
                <LayoutDashboard className="size-4" aria-hidden />
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-full px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="rounded-full bg-foreground px-5 py-2 text-sm font-bold text-background shadow-sm transition-transform hover:scale-[1.04] active:scale-95"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ================= Hero ================= */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-32 size-96 rounded-full bg-secondary blur-3xl"
        />
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 pt-14 pb-16 sm:px-6 sm:pt-20 sm:pb-24 lg:grid-cols-2 lg:gap-14 lg:px-8">
          <div className="text-center lg:text-left">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                <Zap className="size-3.5 fill-energy text-energy" aria-hidden />
                Member-only fitness club
              </span>
            </Reveal>

            <Reveal delay={0.08}>
              <h1 className="mt-6 text-5xl font-extrabold leading-[0.95] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
                TRAIN LIKE IT{" "}
                <span className="text-energy">MATTERS.</span>
              </h1>
            </Reveal>

            <Reveal delay={0.16}>
              <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg lg:mx-0">
                A personalized 30-day plan, a guided workout player, and
                progress tracking that keeps score — all in one installable
                app.
              </p>
            </Reveal>

            <Reveal delay={0.24}>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
                <Link
                  href="/signup"
                  className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-full bg-foreground px-8 py-3.5 text-base font-bold text-background shadow-lg transition-transform duration-200 hover:scale-[1.03] active:scale-95 sm:w-auto"
                >
                  Start your transformation
                  <ArrowRight className="size-5" aria-hidden />
                </Link>
                <a
                  href="#how"
                  className="inline-flex h-13 w-full items-center justify-center rounded-full border border-border bg-card px-8 py-3.5 text-base font-bold text-foreground transition-colors hover:bg-secondary sm:w-auto"
                >
                  See how it works
                </a>
              </div>
            </Reveal>

            <Reveal delay={0.32}>
              <div className="mt-8 flex flex-col items-center gap-2 sm:flex-row sm:gap-4 lg:justify-start">
                <span className="flex gap-0.5" aria-label="Rated 5 out of 5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="size-4 fill-energy text-energy" aria-hidden />
                  ))}
                </span>
                <p className="text-sm font-medium text-muted-foreground">
                  Loved by members who show up daily
                </p>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.15}>
            <div className="relative mx-auto w-full max-w-lg">
              <div className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-2xl shadow-black/25">
                <Image
                  src="/images/hero-workout.jpg"
                  alt="Athlete training with dumbbells in a modern gym"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent"
                />
              </div>

              <div className="absolute -top-4 -left-3 flex items-center gap-2.5 rounded-2xl border border-border bg-card/95 px-4 py-3 shadow-xl backdrop-blur sm:-left-6">
                <span className="grid size-9 place-items-center rounded-full bg-energy/12 text-energy">
                  <Flame className="size-4.5" aria-hidden />
                </span>
                <div>
                  <p className="text-base font-extrabold leading-none tabular-nums text-foreground">
                    12 days
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
                    Current streak
                  </p>
                </div>
              </div>

              <div className="absolute -right-3 -bottom-4 flex items-center gap-2.5 rounded-2xl border border-border bg-card/95 px-4 py-3 shadow-xl backdrop-blur sm:-right-6">
                <span className="grid size-9 place-items-center rounded-full bg-secondary text-secondary-foreground">
                  <Trophy className="size-4.5" aria-hidden />
                </span>
                <div>
                  <p className="text-base font-extrabold leading-none tabular-nums text-foreground">
                    Day 18/30
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
                    Plan progress
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================= Metrics band ================= */}
      <section
        aria-label="Why SWEAT works"
        className="border-b border-border bg-card"
      >
        <div className="mx-auto grid max-w-6xl grid-cols-1 divide-y divide-border px-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-6 lg:px-8">
          {[
            {
              icon: Flame,
              value: "Streaks that stick",
              label: "Daily check-ins and reminders built for consistency, not guilt.",
            },
            {
              icon: Timer,
              value: "Zero planning time",
              label: "Your next workout is always one tap away — decided, timed, ready.",
            },
            {
              icon: TrendingUp,
              value: "Proof of progress",
              label: "Every session feeds charts you'll actually want to look at.",
            },
          ].map(({ icon: Icon, value, label }) => (
            <div
              key={value}
              className="flex items-start gap-4 py-6 sm:px-8 sm:first:pl-0 sm:last:pr-0"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                <Icon className="size-5" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-extrabold text-foreground">{value}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= Features — bento ================= */}
      <section
        id="features"
        aria-label="Features"
        className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6 lg:px-8"
      >
        <Reveal>
          <div className="text-center">
            <SectionLabel>Features</SectionLabel>
            <h2 className="mx-auto mt-3 max-w-lg text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
              Everything you need. Nothing you don&apos;t.
            </h2>
          </div>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Large — plan */}
          <Reveal className="sm:col-span-2">
            <article className="titan-card group flex h-full flex-col p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <span className="grid size-12 place-items-center rounded-xl bg-secondary text-secondary-foreground transition-colors duration-300 group-hover:bg-foreground group-hover:text-background">
                  <CalendarDays className="size-5.5" aria-hidden />
                </span>
                <span className="rounded-full bg-energy/12 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-energy">
                  30 days
                </span>
              </div>
              <h3 className="mt-5 text-xl font-extrabold text-foreground">
                A plan built around you
              </h3>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Your goal, experience, and body shape a day-by-day program.
                Completed, active, and locked days — always visible.
              </p>
              <div className="mt-auto pt-2">
                <PlanWeekVisual />
              </div>
            </article>
          </Reveal>

          {/* Player */}
          <Reveal delay={0.07}>
            <article className="titan-card group flex h-full flex-col p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              <span className="grid size-12 place-items-center rounded-xl bg-secondary text-secondary-foreground transition-colors duration-300 group-hover:bg-foreground group-hover:text-background">
                <Dumbbell className="size-5.5" aria-hidden />
              </span>
              <h3 className="mt-5 text-lg font-extrabold text-foreground">
                Guided player
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Sets, reps, and rest sequenced automatically.
              </p>
              <div className="mt-auto flex items-center gap-2 pt-5" aria-hidden>
                <span className="grid size-9 place-items-center rounded-full bg-foreground">
                  <Play className="ml-0.5 size-3.5 fill-background text-background" />
                </span>
                <span className="rounded-full bg-secondary px-3 py-1 text-[11px] font-bold text-secondary-foreground">
                  Set 2 of 4
                </span>
              </div>
            </article>
          </Reveal>

          {/* Progress */}
          <Reveal delay={0.14}>
            <article className="titan-card group flex h-full flex-col p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              <span className="grid size-12 place-items-center rounded-xl bg-secondary text-secondary-foreground transition-colors duration-300 group-hover:bg-foreground group-hover:text-background">
                <BarChart3 className="size-5.5" aria-hidden />
              </span>
              <h3 className="mt-5 text-lg font-extrabold text-foreground">
                Visible progress
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Minutes, calories, streaks, weight trends.
              </p>
              <div className="mt-auto pt-5">
                <BarsVisual />
              </div>
            </article>
          </Reveal>

          {/* Wide — offline */}
          <Reveal delay={0.1} className="sm:col-span-2">
            <article className="titan-card group flex h-full flex-col justify-between gap-6 p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg sm:flex-row sm:items-center sm:p-8">
              <div>
                <span className="grid size-12 place-items-center rounded-xl bg-secondary text-secondary-foreground transition-colors duration-300 group-hover:bg-foreground group-hover:text-background">
                  <WifiOff className="size-5.5" aria-hidden />
                </span>
                <h3 className="mt-5 text-xl font-extrabold text-foreground">
                  Works offline
                </h3>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                  Installable as an app. Your workouts keep working when your
                  connection doesn&apos;t.
                </p>
              </div>
              <div
                className="flex shrink-0 items-center gap-2.5 self-start rounded-2xl border border-border bg-secondary/60 px-4 py-3 sm:self-center"
                aria-hidden
              >
                <span className="relative flex size-2.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
                </span>
                <span className="text-xs font-bold text-foreground">
                  Cached & ready
                </span>
              </div>
            </article>
          </Reveal>
        </div>
      </section>

      {/* ================= How it works ================= */}
      <section
        id="how"
        aria-label="How it works"
        className="scroll-mt-20 border-y border-border bg-secondary/40"
      >
        <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <Reveal>
            <div className="text-center">
              <SectionLabel>How it works</SectionLabel>
              <h2 className="mx-auto mt-3 max-w-lg text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
                Three steps. Thirty days.
              </h2>
              <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground sm:text-base">
                From sign-up to your first completed plan — no guesswork
                anywhere in between.
              </p>
            </div>
          </Reveal>

          <div className="relative mt-14">
            <div
              aria-hidden
              className="absolute top-8 right-[16%] left-[16%] hidden h-0.5 bg-gradient-to-r from-border via-energy/50 to-border md:block"
            />
            <ol className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
              {STEPS.map((step, i) => (
                <Reveal key={step.number} delay={i * 0.1}>
                  <li className="group relative flex h-full flex-col items-center rounded-2xl border border-border bg-card p-8 text-center shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl">
                    <span className="relative z-10 grid size-16 place-items-center rounded-2xl bg-foreground text-background shadow-lg transition-transform duration-300 group-hover:scale-110">
                      <step.icon className="size-7" aria-hidden />
                    </span>
                    <span
                      aria-hidden
                      className="mt-4 text-[11px] font-extrabold uppercase tracking-[0.25em] text-muted-foreground"
                    >
                      Step {step.number}
                    </span>
                    <h3 className="mt-2 text-lg font-extrabold text-foreground">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {step.description}
                    </p>
                    <span className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-[11px] font-bold text-secondary-foreground">
                      <Zap className="size-3 fill-energy text-energy" aria-hidden />
                      {step.meta}
                    </span>
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ================= Player spotlight ================= */}
      <PlayerShowcase />

      {/* ================= Testimonials ================= */}
      <section
        id="testimonials"
        aria-label="Member stories"
        className="scroll-mt-20 border-b border-border bg-secondary/40"
      >
        <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <Reveal>
            <div className="text-center">
              <SectionLabel>Customer satisfaction</SectionLabel>
              <h2 className="mx-auto mt-3 max-w-lg text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
                People who show up.
              </h2>
              <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground sm:text-base">
                Real habits, real streaks, real results — measured, not
                promised.
              </p>
            </div>
          </Reveal>

          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {SATISFACTION.map((stat, i) => (
              <Reveal key={stat.label} delay={i * 0.07}>
                <div className="titan-card flex items-center gap-4 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                  <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-energy/12 text-energy">
                    <stat.icon className="size-6" aria-hidden />
                  </span>
                  <div>
                    <p className="text-2xl font-extrabold tabular-nums text-foreground sm:text-3xl">
                      {stat.value}
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
                      {stat.label}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            {TESTIMONIALS.map((t, i) => {
              const featured = i === 1;
              return (
                <Reveal key={t.name} delay={i * 0.08}>
                  <figure
                    className={cn(
                      "flex h-full flex-col rounded-2xl border p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl",
                      featured
                        ? "titan-hero border-transparent text-white shadow-2xl shadow-black/25 md:-translate-y-2"
                        : "titan-card"
                    )}
                  >
                    <div className="flex gap-0.5" aria-label="5 out of 5 stars">
                      {[...Array(5)].map((_, s) => (
                        <Star
                          key={s}
                          className="size-4 fill-energy text-energy"
                          aria-hidden
                        />
                      ))}
                    </div>
                    <blockquote
                      className={cn(
                        "mt-4 flex-1 text-sm leading-relaxed",
                        featured ? "font-medium text-white" : "text-foreground"
                      )}
                    >
                      &ldquo;{t.quote}&rdquo;
                    </blockquote>
                    <figcaption
                      className={cn(
                        "mt-5 flex items-center gap-3 border-t pt-4",
                        featured ? "border-white/15" : "border-border"
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-10 shrink-0 place-items-center rounded-full text-sm font-extrabold",
                          featured
                            ? "bg-white text-black"
                            : "bg-secondary text-secondary-foreground"
                        )}
                        aria-hidden
                      >
                        {t.name.charAt(0)}
                      </span>
                      <div>
                        <p
                          className={cn(
                            "text-sm font-bold",
                            featured ? "text-white" : "text-foreground"
                          )}
                        >
                          {t.name}
                        </p>
                        <p
                          className={cn(
                            "mt-0.5 text-xs",
                            featured ? "text-zinc-400" : "text-muted-foreground"
                          )}
                        >
                          {t.detail}
                        </p>
                      </div>
                    </figcaption>
                  </figure>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= Pricing ================= */}
      <section
        id="pricing"
        aria-label="Pricing"
        className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6 lg:px-8"
      >
        <Reveal>
          <div className="text-center">
            <SectionLabel>Pricing</SectionLabel>
            <h2 className="mx-auto mt-3 max-w-md text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
              Pick your pace.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground sm:text-base">
              Start free, upgrade when you want more. No card required, cancel
              anytime.
            </p>
          </div>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 items-stretch gap-5 md:grid-cols-3">
          {TIERS.map((tier, i) => (
            <Reveal key={tier.name} delay={i * 0.09} className={cn(tier.featured && "md:-my-4")}>
              <article
                className={cn(
                  "relative flex h-full flex-col rounded-3xl border p-8 transition-all duration-300 hover:-translate-y-1.5",
                  tier.featured
                    ? "titan-hero border-transparent shadow-2xl shadow-black/30"
                    : "titan-card hover:shadow-xl"
                )}
              >
                {tier.badge && (
                  <span className="absolute -top-3.5 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-energy px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-energy-foreground shadow-lg shadow-energy/30">
                    <Crown className="size-3.5" aria-hidden />
                    {tier.badge}
                  </span>
                )}

                <h3
                  className={cn(
                    "text-sm font-extrabold uppercase tracking-[0.2em]",
                    tier.featured ? "text-zinc-400" : "text-muted-foreground"
                  )}
                >
                  {tier.name}
                </h3>

                <p className="mt-4 flex items-end gap-1">
                  <span
                    className={cn(
                      "text-5xl font-extrabold tracking-tight tabular-nums",
                      tier.featured ? "text-white" : "text-foreground"
                    )}
                  >
                    {tier.price}
                  </span>
                  <span
                    className={cn(
                      "pb-1.5 text-sm font-semibold",
                      tier.featured ? "text-zinc-500" : "text-muted-foreground"
                    )}
                  >
                    {tier.period}
                  </span>
                </p>

                <p
                  className={cn(
                    "mt-2 text-sm",
                    tier.featured ? "text-zinc-400" : "text-muted-foreground"
                  )}
                >
                  {tier.tagline}
                </p>

                <ul className="mt-7 flex-1 space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature.label} className="flex items-start gap-2.5">
                      {feature.included ? (
                        <Check
                          className={cn(
                            "mt-0.5 size-4 shrink-0",
                            tier.featured ? "text-energy" : "text-foreground"
                          )}
                          strokeWidth={3}
                          aria-hidden
                        />
                      ) : (
                        <X
                          className="mt-0.5 size-4 shrink-0 text-muted-foreground/50"
                          aria-hidden
                        />
                      )}
                      <span
                        className={cn(
                          "text-sm",
                          feature.included
                            ? cn(
                                "font-medium",
                                tier.featured ? "text-zinc-200" : "text-foreground"
                              )
                            : "text-muted-foreground/60 line-through decoration-muted-foreground/40"
                        )}
                      >
                        {feature.label}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/signup"
                  className={cn(
                    "mt-8 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-bold transition-transform duration-200 hover:scale-[1.02] active:scale-95",
                    tier.featured
                      ? "bg-white text-black shadow-lg"
                      : "border border-border bg-card text-foreground hover:bg-secondary"
                  )}
                >
                  {tier.cta}
                  <ArrowRight className="size-4.5" aria-hidden />
                </Link>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.15}>
          <p className="mx-auto mt-10 flex max-w-md items-center justify-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-center text-xs font-semibold text-muted-foreground">
            <Zap className="size-3.5 fill-energy text-energy" aria-hidden />
            All plans are currently free while SWEAT is in beta — pay nothing
            yet.
          </p>
        </Reveal>
      </section>

      {/* ================= FAQ — split layout ================= */}
      <section
        id="faq"
        aria-label="Frequently asked questions"
        className="scroll-mt-20 border-t border-border bg-secondary/40"
      >
        <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.5fr] lg:gap-16">
            <div className="self-start lg:sticky lg:top-24">
              <Reveal>
                <SectionLabel>FAQ</SectionLabel>
                <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
                  Questions, answered.
                </h2>
                <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Everything members ask before their first session. Still
                  unsure about something?
                </p>
                <Link
                  href="/signup"
                  className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-foreground px-6 text-sm font-bold text-background transition-transform hover:scale-[1.03] active:scale-95"
                >
                  Try it free
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Reveal>
            </div>

            <div className="space-y-3">
              {FAQS.map((faq, i) => (
                <Reveal key={faq.question} delay={i * 0.05}>
                  <details className="titan-card group overflow-hidden [&_summary::-webkit-details-marker]:hidden">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-sm font-bold text-foreground transition-colors hover:bg-secondary/50 sm:p-6 sm:text-base">
                      <span className="flex items-center gap-3">
                        <span className="hidden text-xs font-extrabold tabular-nums text-energy sm:inline">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        {faq.question}
                      </span>
                      <ChevronDown
                        className="size-5 shrink-0 text-muted-foreground transition-transform duration-300 group-open:rotate-180"
                        aria-hidden
                      />
                    </summary>
                    <p className="border-t border-border px-5 py-4 text-sm leading-relaxed text-muted-foreground sm:px-6">
                      {faq.answer}
                    </p>
                  </details>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================= Final CTA ================= */}
      <section className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
        <Reveal>
          <div className="titan-hero relative overflow-hidden rounded-[2.5rem] px-6 py-16 text-center shadow-2xl shadow-black/25 sm:px-12 sm:py-24">
            <div
              aria-hidden
              className="pointer-events-none absolute top-0 left-1/2 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-white/25 to-transparent"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-40 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-energy/10 blur-3xl"
            />

            <span className="relative mx-auto grid size-14 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15">
              <Heart className="size-6 fill-energy text-energy" aria-hidden />
            </span>

            <h2 className="relative mx-auto mt-8 max-w-2xl text-4xl font-extrabold leading-[1.02] tracking-tight text-white sm:text-6xl">
              The only bad workout is the one you skipped.
            </h2>
            <p className="relative mx-auto mt-5 max-w-md text-sm text-zinc-400 sm:text-base">
              Create your account, answer a few questions, and start Day 1
              today.
            </p>

            <div className="relative mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {isAuthenticated ? (
                <Link
                  href="/dashboard"
                  className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-bold text-black shadow-lg transition-transform duration-200 hover:scale-[1.03] active:scale-95 sm:w-auto"
                >
                  Go to your dashboard
                  <ArrowRight className="size-5" aria-hidden />
                </Link>
              ) : (
                <>
                  <Link
                    href="/signup"
                    className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-bold text-black shadow-lg transition-transform duration-200 hover:scale-[1.03] active:scale-95 sm:w-auto"
                  >
                    Get started free
                    <ArrowRight className="size-5" aria-hidden />
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex h-13 w-full items-center justify-center rounded-full border border-white/20 px-8 py-3.5 text-base font-bold text-white transition-colors hover:bg-white/10 sm:w-auto"
                  >
                    I&apos;m a member
                  </Link>
                </>
              )}
            </div>

            <div className="relative mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-semibold text-zinc-500">
              <span className="inline-flex items-center gap-1.5">
                <Check className="size-3.5 text-energy" strokeWidth={3} aria-hidden />
                No card required
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="size-3.5 text-energy" strokeWidth={3} aria-hidden />
                Free during beta
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="size-3.5 text-energy" strokeWidth={3} aria-hidden />
                Cancel anytime
              </span>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ================= Footer ================= */}
      <footer className="border-t border-border bg-background">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr]">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-lg bg-foreground">
                  <FireMark className="size-4 text-background" />
                </span>
                <span className="text-base font-extrabold tracking-widest text-foreground">
                  SWEAT
                </span>
              </div>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
                Built for people who show up. Personalized plans, guided
                sessions, honest numbers.
              </p>
            </div>

            <nav aria-label="Product links" className="text-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Product
              </p>
              <ul className="mt-4 space-y-2.5">
                {[
                  { href: "#features", label: "Features" },
                  { href: "#how", label: "How it works" },
                  { href: "#pricing", label: "Pricing" },
                  { href: "#faq", label: "FAQ" },
                ].map(({ href, label }) => (
                  <li key={href}>
                    <a
                      href={href}
                      className="font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <nav aria-label="Account links" className="text-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Account
              </p>
              <ul className="mt-4 space-y-2.5">
                {[
                  ...(isAuthenticated
                    ? [{ href: "/dashboard", label: "Dashboard" }]
                    : [
                        { href: "/login", label: "Sign in" },
                        { href: "/signup", label: "Create account" },
                      ]),
                  { href: "/forgot-password", label: "Reset password" },
                ].map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Get the app
              </p>
              <div className="titan-hero mt-4 rounded-2xl p-5">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10 text-white">
                    <Smartphone className="size-5" aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-extrabold text-white">
                      Installable PWA
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      Full-screen, offline-ready
                    </p>
                  </div>
                </div>
                <Link
                  href="/signup"
                  className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-full bg-white px-4 text-xs font-bold text-black transition-transform hover:scale-[1.02] active:scale-95"
                >
                  Install after sign-up
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border pt-8 sm:flex-row">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} SWEAT. All rights reserved.
            </p>
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Bell className="size-3.5" aria-hidden />
              Reminders included
              <span className="mx-1 text-border">|</span>
              <WifiOff className="size-3.5" aria-hidden />
              Works offline
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
