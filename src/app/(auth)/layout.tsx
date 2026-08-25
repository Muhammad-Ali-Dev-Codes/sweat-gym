import Link from "next/link";
import { FireMark } from "@/components/brand/fire-mark";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-background font-[family-name:var(--font-geist-sans)]">
      {/* Dark SWEAT background — near-black with faint energy glows */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage: [
            "radial-gradient(ellipse 60% 50% at 15% 20%, rgb(255 255 255 / 0.05), transparent)",
            "radial-gradient(ellipse 55% 45% at 85% 15%, rgb(255 255 255 / 0.03), transparent)",
            "radial-gradient(ellipse 70% 55% at 80% 90%, rgb(56 130 246 / 0.14), transparent)",
            "radial-gradient(ellipse 40% 35% at 12% 92%, rgb(34 100 210 / 0.10), transparent)",
          ].join(", "),
        }}
      />
      {/* Subtle depth blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-24 size-96 rounded-full bg-white/5 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -bottom-32 size-[28rem] rounded-full bg-energy/10 blur-3xl"
      />

      {/* Top bar */}
      <header className="relative z-20 flex items-center justify-between px-6 py-5 sm:px-10">
        <Link
          href="/"
          aria-label="SWEAT home"
          className="flex items-center gap-2.5 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-[#ffc247] to-[#ff5a1f] shadow-md">
            <FireMark className="size-4.5 text-white" />
          </span>
          <span className="text-lg font-extrabold tracking-widest text-foreground">
            SWEAT
          </span>
        </Link>

        <nav className="flex items-center gap-4 sm:gap-8">
          <Link
            href="/"
            className="hidden text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground sm:inline"
          >
            Home
          </Link>
          <Link
            href="/signup"
            className="rounded-lg border-2 border-primary px-5 py-2 text-sm font-bold text-primary transition-all duration-200 hover:bg-primary hover:text-primary-foreground"
          >
            Get Started
          </Link>
        </nav>
      </header>

      {/* Centered glass card */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 pb-16 pt-4">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
