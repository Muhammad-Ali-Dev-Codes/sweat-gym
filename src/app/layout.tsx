import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/providers";
import "@/lib/env";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "SWEAT — Earn Every Drop",
    template: "%s · SWEAT",
  },
  description:
    "Member-only fitness Progressive Web App with personalized workouts, progress tracking, and offline support.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SWEAT",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1830" },
  ],
  width: "device-width",
  initialScale: 1,
  // No maximumScale: pinch-zoom must stay available (WCAG 1.4.4).
  // cover: extends the canvas behind notches/home indicators so the
  // env(safe-area-inset-*) paddings used by the shell and bottom nav apply.
  viewportFit: "cover",
};

// Theme is resolved on the SERVER from the titan-theme cookie, so the
// correct class lands in the initial HTML — no inline script, no flash,
// and no React script-tag warnings. The client keeps the cookie synced
// with the RESOLVED theme (system is resolved to concrete light/dark)
// whenever preferences change or are restored (see profile page).
async function getThemeClass(): Promise<string> {
  const cookieStore = await cookies();
  return cookieStore.get("titan-theme")?.value === "dark" ? "dark" : "";
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const themeClass = await getThemeClass();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${themeClass} h-full antialiased`.trim()}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
