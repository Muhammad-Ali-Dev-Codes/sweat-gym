"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { AlertCircle, Eye, EyeOff, Loader2, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type AuthFieldProps = {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  icon?: ReactNode;
};

export function AuthField({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
  minLength,
  icon,
}: AuthFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && showPassword ? "text" : type;

  return (
    <div>
      <label
        htmlFor={id}
        className="text-sm font-semibold text-muted-foreground"
      >
        {label}
      </label>
      <div className="relative mt-1">
        {icon && (
          <span className="pointer-events-none absolute top-1/2 left-0 grid size-9 -translate-y-1/2 place-items-center text-muted-foreground">
            {icon}
          </span>
        )}
        <input
          id={id}
          name={id}
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          className={cn(
            "h-11 w-full border-b-2 border-border bg-transparent pr-10 text-[15px] text-foreground outline-none transition-colors duration-200 placeholder:text-muted-foreground/60 focus:border-ring",
            icon && "pl-10"
          )}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute top-1/2 right-0 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {showPassword ? (
              <EyeOff className="size-5" aria-hidden />
            ) : (
              <Eye className="size-5" aria-hidden />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 26 }}
      className="relative w-full rounded-2xl border border-border bg-card/85 p-8 shadow-[0_32px_80px_-16px_rgb(0_0_0/0.6)] backdrop-blur-2xl sm:p-10"
    >
      <Link
        href="/"
        aria-label="Close and go home"
        className="absolute -top-3.5 -right-3.5 grid size-9 place-items-center rounded-xl bg-secondary text-secondary-foreground shadow-lg transition-transform duration-200 hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <X className="size-4.5" aria-hidden />
      </Link>
      {children}
    </motion.div>
  );
}

export function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <motion.div
      role="alert"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className="flex items-start gap-2.5 rounded-xl bg-red-500/10 px-4 py-3"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-400" aria-hidden />
      <p className="text-sm font-medium text-red-400">{message}</p>
    </motion.div>
  );
}

export function SubmitButton({
  loading,
  children,
  loadingLabel,
}: {
  loading: boolean;
  children: ReactNode;
  loadingLabel: string;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className={cn(
        "inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-base font-bold text-primary-foreground shadow-lg",
        "transition-all duration-200 hover:bg-primary/90 hover:shadow-xl active:scale-[0.98]",
        "disabled:pointer-events-none disabled:opacity-60"
      )}
    >
      {loading ? (
        <>
          <Loader2 className="size-4.5 animate-spin" aria-hidden />
          {loadingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function AuthHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-8 text-center">
      <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
      ) : null}
    </div>
  );
}
