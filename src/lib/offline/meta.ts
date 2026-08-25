import { db } from "./db";

const LAST_SYNC_KEY = "lastSyncAt";
const APP_VERSION_KEY = "appVersion";

export async function getLastSyncTime(): Promise<number | null> {
  const entry = await db.localMeta.get(LAST_SYNC_KEY);
  return entry ? Number(entry.value) : null;
}

export async function setLastSyncTime(time: number = Date.now()): Promise<void> {
  await db.localMeta.put({
    key: LAST_SYNC_KEY,
    value: String(time),
    updatedAt: time,
  });
}

export async function getAppVersion(): Promise<string | null> {
  const entry = await db.localMeta.get(APP_VERSION_KEY);
  return entry?.value ?? null;
}

export async function setAppVersion(version: string): Promise<void> {
  await db.localMeta.put({
    key: APP_VERSION_KEY,
    value: version,
    updatedAt: Date.now(),
  });
}

export async function getMetaValue(key: string): Promise<string | null> {
  const entry = await db.localMeta.get(key);
  return entry?.value ?? null;
}

export async function setMetaValue(key: string, value: string): Promise<void> {
  await db.localMeta.put({
    key,
    value,
    updatedAt: Date.now(),
  });
}
