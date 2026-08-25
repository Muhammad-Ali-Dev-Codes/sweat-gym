import { db, type CachedMedia } from "./db";

export async function markMediaPending(url: string): Promise<void> {
  await db.cachedMedia.put({
    url,
    status: "pending",
    cachedAt: undefined,
  });
}

export async function markMediaDownloading(url: string): Promise<void> {
  await db.cachedMedia.put({
    url,
    status: "downloading",
    cachedAt: undefined,
  });
}

export async function markMediaCached(url: string): Promise<void> {
  await db.cachedMedia.put({
    url,
    status: "cached",
    cachedAt: Date.now(),
  });
}

export async function markMediaFailed(url: string, error: string): Promise<void> {
  await db.cachedMedia.put({
    url,
    status: "failed",
    error,
  });
}

export async function isMediaCached(url: string): Promise<boolean> {
  const entry = await db.cachedMedia.get(url);
  return entry?.status === "cached";
}

export async function getMediaStatus(url: string): Promise<CachedMedia | undefined> {
  return db.cachedMedia.get(url);
}

export async function getAllCachedMedia(): Promise<CachedMedia[]> {
  return db.cachedMedia.toArray();
}

export async function deleteMediaEntry(url: string): Promise<void> {
  await db.cachedMedia.delete(url);
}

export async function clearAllMediaCache(): Promise<void> {
  await db.cachedMedia.clear();
}
