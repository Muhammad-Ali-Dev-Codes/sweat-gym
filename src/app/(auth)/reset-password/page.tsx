"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AuthCard,
  AuthField,
  AuthHeading,
  FormError,
  SubmitButton,
} from "@/components/auth/form-primitives";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.updateUser({
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  };

  return (
    <AuthCard>
      <AuthHeading
        title="Set New Password"
        subtitle="Choose something strong — you'll only need it occasionally."
      />

      <form onSubmit={handleReset} className="space-y-5">
        <AuthField
          id="password"
          label="New Password"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="At least 6 characters"
          autoComplete="new-password"
          required
          minLength={6}
        />
        <AuthField
          id="confirm-password"
          label="Confirm Password"
          type="password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          placeholder="Repeat your new password"
          autoComplete="new-password"
          required
          minLength={6}
        />

        <FormError message={error} />

        <SubmitButton loading={loading} loadingLabel="Updating…">
          Update Password
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
