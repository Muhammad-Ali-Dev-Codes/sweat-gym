import { createClient } from "@/lib/supabase/client";
import type { User, AuthError } from "@supabase/supabase-js";

export interface AuthResult {
  data: { user: User | null } | null;
  error: AuthError | null;
}

export async function signUp(email: string, password: string, fullName: string): Promise<AuthResult> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  return { data, error };
}

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

export async function signInWithGoogle(): Promise<{ data: { url: string | null } | null; error: AuthError | null }> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  return { data, error };
}

export async function signOut(): Promise<{ error: AuthError | null }> {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function resetPassword(email: string): Promise<{ data: { [key: string]: unknown } | null; error: AuthError | null }> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  return { data, error };
}

export async function updatePassword(newPassword: string): Promise<{ data: { user: User | null } | null; error: AuthError | null }> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  return { data, error };
}

export async function resendVerification(email: string): Promise<{ data: { [key: string]: unknown } | null; error: AuthError | null }> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      // Keep the resent confirmation link anchored to this origin's
      // callback, matching the original signup redirect.
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  return { data, error };
}

export async function getUser(): Promise<User | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getSession() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}
