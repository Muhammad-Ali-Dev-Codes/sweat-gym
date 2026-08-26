"use client";

import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

type FavoriteButtonProps = {
  isFavorited: boolean;
  exerciseName: string;
  onClick: () => void;
  size?: "sm" | "md";
  className?: string;
};

function FavoriteButton({
  isFavorited,
  exerciseName,
  onClick,
  size = "md",
  className,
}: FavoriteButtonProps) {
  const label = isFavorited
    ? `Remove ${exerciseName} from favorites`
    : `Save ${exerciseName} to favorites`;

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={isFavorited}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "grid place-items-center rounded-full transition-all duration-200",
        size === "sm" ? "size-8" : "size-10",
        isFavorited
          ? "bg-red-50 text-red-500 dark:bg-red-500/15 dark:text-red-400"
          : "bg-background/80 text-muted-foreground backdrop-blur-sm hover:bg-background hover:text-foreground",
        className
      )}
    >
      <Heart
        className={cn(
          "transition-all duration-200",
          size === "sm" ? "size-4" : "size-5",
          isFavorited && "fill-current"
        )}
        aria-hidden
      />
    </button>
  );
}

export { FavoriteButton };
export type { FavoriteButtonProps };
