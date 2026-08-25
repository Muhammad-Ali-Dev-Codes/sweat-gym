import { cn } from "@/lib/utils";

/**
 * SWEAT brand mark — a bold flame with a hollow core.
 * Inherits `currentColor` so it adapts to light/dark surfaces.
 */
export function FireMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={cn("size-5", className)}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M13.1 1.3C13.8 4.8 12.9 7.4 11 9.4C8.9 11.6 6.5 13.6 6.5 16.5C6.5 19.9 9 22.7 12.1 22.7C15.3 22.7 17.9 20 17.9 16.8C17.9 14 16.5 11.8 15 10C14.8 11.5 14 12.7 12.9 13.4C13.4 9.6 13.5 4.9 13.1 1.3ZM12.1 20.1C10.4 20.1 9.1 18.6 9.1 16.8C9.1 15.1 10.3 13.9 11.3 12.5C11.6 12.1 11.9 11.6 12.1 11.1C12.3 11.6 12.6 12.1 12.9 12.5C13.9 13.9 15.1 15.1 15.1 16.8C15.1 18.6 13.8 20.1 12.1 20.1Z"
        fill="currentColor"
      />
    </svg>
  );
}
