"use client";

import Link from "next/link";
import { AuthCard } from "@/components/auth/form-primitives";

export default function VerifyEmailPage() {
  return (
    <AuthCard>
      <div className="py-4 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary shadow-lg">
          <MailIcon />
        </span>
        <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          Verify Your Email
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
          Please check your inbox and click the verification link to activate
          your account.
        </p>
        <Link
          href="/login"
          className="mt-8 inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 active:scale-[0.98]"
        >
          Go to Login
        </Link>
      </div>
    </AuthCard>
  );
}

function MailIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-foreground"
      aria-hidden
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}
