"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useState } from "react";
import {
  AuthCard,
  AuthField,
  AuthHeading,
  FormError,
  SubmitButton,
} from "@/components/auth/form-primitives";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <AuthCard>
        <div className="py-4 text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary shadow-lg">
            <MailIcon />
          </span>
          <h2 className="mt-6 text-2xl font-extrabold tracking-tight text-foreground">
            Reset link sent.
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            We sent a password reset link to{" "}
            <span className="font-bold text-foreground">{email}</span>.
          </p>
          <Link
            href="/login"
            className="mt-7 inline-flex h-11 items-center justify-center rounded-xl border-2 border-primary px-6 text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            Back to Login
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <AuthHeading
        title="Forgot Password?"
        subtitle="Enter your email and we'll send you a reset link."
      />

      <form onSubmit={handleReset} className="space-y-5">
        <AuthField
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />

        <FormError message={error} />

        <SubmitButton loading={loading} loadingLabel="Sending…">
          Send Reset Link
        </SubmitButton>
      </form>

      <p className="mt-7 text-center text-sm text-muted-foreground">
        Remembered it after all?{" "}
        <Link
          href="/login"
          className="font-bold text-foreground underline-offset-4 hover:underline"
        >
          Login
        </Link>
      </p>
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
