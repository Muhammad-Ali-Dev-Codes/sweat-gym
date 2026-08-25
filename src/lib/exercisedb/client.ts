import type { ExerciseDbExerciseDTO, ExerciseDbResponse } from "./types";

const BASE_URL = process.env.EXERCISEDB_API_URL || "https://oss.exercisedb.dev/api/v1";
const DEFAULT_LIMIT = 100;
const REQUEST_DELAY_MS = 500;
const MAX_RETRIES = 3;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchExercisesPage(
  cursor?: string,
  limit: number = DEFAULT_LIMIT
): Promise<ExerciseDbResponse> {
  const params = new URLSearchParams({ limit: limit.toString() });
  if (cursor) params.set("cursor", cursor);

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(`${BASE_URL}/exercises?${params}`);
      if (response.status === 429) {
        const waitMs = Math.max(5000, 3000 * (attempt + 1));
        console.log(`\n  Rate limited. Waiting ${waitMs / 1000}s...`);
        await delay(waitMs);
        continue;
      }
      if (!response.ok) {
        lastError = new Error(`ExerciseDB API error: ${response.status}`);
        await delay(2000 * (attempt + 1));
        continue;
      }
      return response.json();
    } catch (err) {
      lastError = err as Error;
      await delay(2000 * (attempt + 1));
    }
  }
  throw lastError || new Error("Failed to fetch exercises");
}

export async function fetchAllExercises(
  onProgress?: (fetched: number, total: number) => void
): Promise<ExerciseDbExerciseDTO[]> {
  const seen = new Set<string>();
  const allExercises: ExerciseDbExerciseDTO[] = [];
  let cursor: string | null = null;
  let total = 0;
  let pageNum = 0;
  const MAX_PAGES = 200;

  while (pageNum < MAX_PAGES) {
    const response = await fetchExercisesPage(cursor || undefined);
    if (!response.success || response.data.length === 0) break;

    total = response.meta.total;
    for (const ex of response.data) {
      if (!seen.has(ex.exerciseId)) {
        seen.add(ex.exerciseId);
        allExercises.push(ex);
      }
    }

    pageNum++;
    onProgress?.(allExercises.length, total);

    if (!response.meta.hasNextPage || !response.meta.nextCursor) break;
    if (allExercises.length >= total) break;

    cursor = response.meta.nextCursor;
    await delay(REQUEST_DELAY_MS);
  }

  return allExercises;
}

export async function fetchExerciseById(id: string): Promise<ExerciseDbExerciseDTO | null> {
  const response = await fetch(`${BASE_URL}/exercises/${id}`);
  if (!response.ok) return null;
  const data = await response.json();
  return data.success ? data.data : null;
}
