"use client";

import { signUp } from "@/services/auth";
import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Check, Eye, EyeOff, X } from "lucide-react";
import {
  AuthCard,
  AuthField,
  AuthHeading,
  FormError,
  SubmitButton,
} from "@/components/auth/form-primitives";
import { cn } from "@/lib/utils";

type Rule = { label: string; ok: boolean };

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Password policy: minimum 8 characters mixing letters and numbers.
  const rules: Rule[] = useMemo(
    () => [
      { label: "At least 8 characters", ok: password.length >= 8 },
      { label: "Contains a letter", ok: /[a-zA-Z]/.test(password) },
      { label: "Contains a number", ok: /\d/.test(password) },
      { label: "Passwords match", ok: password.length > 0 && password === confirmPassword },
    ],
    [password, confirmPassword]
  );
  const allRulesOk = rules.every((r) => r.ok);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!allRulesOk) {
      setError("Please meet all password requirements below.");
      return;
    }

    setLoading(true);

    // The shared wrapper pins emailRedirectTo to /auth/callback on THIS
    // origin, so the confirmation link always lands back in the app that
    // started it (never the Supabase default Site URL).
    const { error: authError } = await signUp(email, password, fullName);

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
            <Check className="size-7 text-foreground" strokeWidth={3} aria-hidden />
          </span>
          <h2 className="mt-6 text-2xl font-extrabold tracking-tight text-foreground">
            Check your inbox.
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            We sent a confirmation link to{" "}
            <span className="font-bold text-foreground">{email}</span>. Click it
            to activate your account.
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
        title="Create Account"
        subtitle="Start your transformation — your first plan is minutes away."
      />

      <form onSubmit={handleSignup} className="space-y-5" noValidate>
        <AuthField
          id="full-name"
          label="Full Name"
          value={fullName}
          onChange={setFullName}
          placeholder="Alex Carter"
          autoComplete="name"
          required
        />
        <AuthField
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
          autoComplete="email"
          required
          invalid={!!error}
          describedBy="signup-form-error"
        />

        <div className="relative">
          <AuthField
            id="password"
            label="Password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={setPassword}
            placeholder="Minimum 8 characters"
            autoComplete="new-password"
            required
            invalid={!!error}
            describedBy="signup-form-error"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute top-9 right-3 grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:text-foreground before:absolute before:-inset-1.5 before:content-['']"
          >
            {showPassword ? <EyeOff className="size-4.5" aria-hidden /> : <Eye className="size-4.5" aria-hidden />}
          </button>
        </div>

        <AuthField
          id="confirm-password"
          label="Confirm Password"
          type={showPassword ? "text" : "password"}
          value={confirmPassword}
          onChange={setConfirmPassword}
          placeholder="Re-enter your password"
          autoComplete="new-password"
          required
          invalid={!!error}
          describedBy="signup-form-error"
        />

        {/* Live requirements checklist */}
        <motion.ul
          initial={false}
          aria-label="Password requirements"
          className="-mt-1 space-y-1.5 rounded-xl bg-secondary/60 px-3.5 py-3"
        >
          {rules.map((rule) => (
            <li
              key={rule.label}
              className={cn(
                "flex items-center gap-2 text-xs font-medium transition-colors duration-200",
                rule.ok ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
              )}
            >
              <span
                className={cn(
                  "grid size-4 shrink-0 place-items-center rounded-full transition-colors duration-200",
                  rule.ok ? "bg-emerald-500 text-white" : "bg-muted-foreground/20 text-transparent"
                )}
                aria-hidden
              >
                {rule.ok ? <Check className="size-2.5" strokeWidth={3.5} /> : <X className="size-2.5" />}
              </span>
              {rule.label}
            </li>
          ))}
        </motion.ul>

        <FormError message={error} id="signup-form-error" />

        <SubmitButton loading={loading} loadingLabel="Creating account…">
          Register
        </SubmitButton>
      </form>

      <p className="mt-7 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
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
