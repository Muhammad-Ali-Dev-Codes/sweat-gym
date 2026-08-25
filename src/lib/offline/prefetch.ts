import {
  markMediaPending,
  markMediaDownloading,
  markMediaCached,
  markMediaFailed,
} from "./media";

export async function prefetchMedia(urls: string[]): Promise<void> {
  const deduped = [...new Set(urls)];

  await Promise.allSettled(deduped.map((url) => markMediaPending(url)));

  for (const url of deduped) {
    try {
      await markMediaDownloading(url);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const cache = await caches.open("gym-exercise-media-v1");
      await cache.put(url, res);
      await markMediaCached(url);
    } catch (err) {
      await markMediaFailed(url, err instanceof Error ? err.message : String(err));
    }
  }
}

export async function clearMediaCache(): Promise<void> {
  const cacheNames = ["gym-exercise-media-v1"];
  for (const name of cacheNames) {
    await caches.delete(name);
  }
}
