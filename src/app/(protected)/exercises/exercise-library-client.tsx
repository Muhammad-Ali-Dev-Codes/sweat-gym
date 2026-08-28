"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { SearchX } from "lucide-react";
import { useExerciseLibrary, useExerciseFavorites, useToggleExerciseFavorite } from "@/hooks/use-exercises";
import { PageHeader } from "@/components/layout/page-header";
import { SearchBar } from "@/components/ui/search-bar";
import { ExerciseCard } from "@/components/ui/exercise-card";
import { FavoriteButton } from "@/components/ui/favorite-button";
import { ExerciseFilterSheet } from "@/components/ui/exercise-filter-sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import type { ExerciseFilters, ExerciseSortOption } from "@/lib/types/database";
import { cn } from "@/lib/utils";

const SORT_OPTIONS: { label: string; value: ExerciseSortOption }[] = [
  { label: "A–Z", value: "name" },
  { label: "Difficulty", value: "difficulty" },
  { label: "Newest", value: "newest" },
];

type Props = {
  userId: string;
};

export function ExerciseLibraryClient({ userId }: Props) {
  const [filters, setFilters] = useState<ExerciseFilters>({ sort: "name" });
  const [showFilters, setShowFilters] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } =
    useExerciseLibrary(filters);
  const { data: favoriteIds } = useExerciseFavorites(userId);
  const toggleFav = useToggleExerciseFavorite(userId);

  const exercises = useMemo(
    () => data?.pages.flatMap((p) => p.exercises) ?? [],
    [data]
  );

  const totalCount = data?.pages[0]?.total ?? 0;

  const handleSearch = useCallback(
    (value: string) => {
      setSearchInput(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setFilters((prev) => ({ ...prev, search: value || undefined }));
      }, 300);
    },
    []
  );

  const activeFilterCount = [
    filters.category,
    filters.difficulty,
    filters.muscle,
    filters.equipment,
    filters.exerciseType,
  ].filter(Boolean).length;

  const hasActiveFilters = activeFilterCount > 0 || !!filters.search;

  return (
    <div className="font-[family-name:var(--font-geist-sans)]">
      <PageHeader
        title="Exercise Library"
        subtitle="Explore exercises and find the right movement for your workout."
        className="mb-6"
      />

      {/* Search + Filter controls */}
      <div className="mb-6 flex gap-3">
        <SearchBar
          value={searchInput}
          onChange={handleSearch}
          placeholder="Search exercises..."
          className="flex-1"
        />
        <button
          type="button"
          onClick={() => setShowFilters(true)}
          className={cn(
            "relative flex shrink-0 items-center gap-2 rounded-full border px-4 py-3 text-sm font-semibold transition-all",
            activeFilterCount > 0
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-primary"
          )}
          aria-label={`Open filters${activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ""}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4"
            aria-hidden
          >
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          Filters
          {activeFilterCount > 0 && (
            <span className="grid size-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {filters.search && (
            <Chip
              label={`"${filters.search}"`}
              onRemove={() => {
                setSearchInput("");
                setFilters((prev) => ({ ...prev, search: undefined }));
              }}
            />
          )}
          {filters.category && (
            <Chip
              label={filters.category.replace("_", " ")}
              onRemove={() => setFilters((prev) => ({ ...prev, category: undefined }))}
            />
          )}
          {filters.difficulty && (
            <Chip
              label={filters.difficulty}
              onRemove={() => setFilters((prev) => ({ ...prev, difficulty: undefined }))}
            />
          )}
          {filters.muscle && (
            <Chip
              label={filters.muscle.replace("_", " ")}
              onRemove={() => setFilters((prev) => ({ ...prev, muscle: undefined }))}
            />
          )}
          {filters.equipment && (
            <Chip
              label={filters.equipment === "none" ? "No Equipment" : filters.equipment.replace("_", " ")}
              onRemove={() => setFilters((prev) => ({ ...prev, equipment: undefined }))}
            />
          )}
          {filters.exerciseType && (
            <Chip
              label={filters.exerciseType.replace("_", " ")}
              onRemove={() => setFilters((prev) => ({ ...prev, exerciseType: undefined }))}
            />
          )}
          <button
            type="button"
            onClick={() => {
              setSearchInput("");
              setFilters({ sort: "name" });
            }}
            className="text-xs font-semibold text-primary hover:underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Sort row */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground" aria-live="polite">
          {isLoading ? "Loading..." : `${totalCount} exercise${totalCount !== 1 ? "s" : ""}`}
        </p>
        <div className="flex gap-1" role="radiogroup" aria-label="Sort exercises">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={filters.sort === opt.value}
              onClick={() => setFilters((prev) => ({ ...prev, sort: opt.value }))}
              className={cn(
                "rounded-full px-3 py-1 text-[11px] font-semibold transition-all",
                filters.sort === opt.value
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="titan-card flex items-center gap-3.5 p-3.5">
              <Skeleton className="size-14 shrink-0 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {isError && (
        <EmptyState
          icon={SearchX}
          title="Couldn't load exercises"
          description="Check your connection and try again."
          action={
            <Button onClick={() => window.location.reload()}>Retry</Button>
          }
        />
      )}

      {/* Empty state */}
      {!isLoading && !isError && exercises.length === 0 && (
        <EmptyState
          icon={SearchX}
          title="No exercises found"
          description="Try another search or remove some filters."
          action={
            hasActiveFilters ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchInput("");
                  setFilters({ sort: "name" });
                }}
              >
                Clear filters
              </Button>
            ) : undefined
          }
        />
      )}

      {/* Exercise list */}
      {!isLoading && !isError && exercises.length > 0 && (
        <>
          <div className="space-y-2">
            {exercises.map((exercise) => (
              <ExerciseCard key={exercise.id} exercise={exercise}>
                <FavoriteButton
                  isFavorited={favoriteIds?.has(exercise.id) ?? false}
                  exerciseName={exercise.name}
                  size="sm"
                  onClick={() =>
                    toggleFav.mutate({
                      exerciseId: exercise.id,
                      isFavorited: favoriteIds?.has(exercise.id) ?? false,
                    })
                  }
                />
              </ExerciseCard>
            ))}
          </div>

          {/* Load more */}
          {hasNextPage && (
            <div className="mt-8 flex justify-center">
              <Button
                variant="outline"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? "Loading..." : "Load more"}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Filter sheet */}
      {showFilters && (
        <ExerciseFilterSheet
          open={showFilters}
          filters={filters}
          onApply={setFilters}
          onClose={() => setShowFilters(false)}
        />
      )}
    </div>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
      <span className="capitalize">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-primary/20"
        aria-label={`Remove ${label} filter`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-3"
          aria-hidden
        >
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>
    </span>
  );
}
