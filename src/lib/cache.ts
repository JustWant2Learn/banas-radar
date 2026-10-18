/**
 * Tiny TTL cache backed by localStorage (with an in-memory fallback for
 * environments without storage, e.g. SSR or private mode quota errors).
 *
 * Entries past their TTL are reported as stale rather than deleted so callers
 * can still show "last known" data when the network is unavailable.
 */

export const THIRTY_MINUTES_MS = 30 * 60 * 1000;

interface CacheEnvelope<T> {
  savedAt: number;
  value: T;
}

export interface CacheHit<T> {
  value: T;
  savedAt: number;
  isStale: boolean;
}

const memory = new Map<string, string>();
const PREFIX = "banas:cache:";

function storageGet(key: string): string | null {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage.getItem(PREFIX + key);
    }
  } catch {
    // fall through to memory
  }
  return memory.get(key) ?? null;
}

function storageSet(key: string, raw: string): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(PREFIX + key, raw);
      return;
    }
  } catch {
    // quota exceeded or unavailable — fall back to memory
  }
  memory.set(key, raw);
}

function isEnvelope<T>(value: unknown): value is CacheEnvelope<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    "savedAt" in value &&
    typeof (value as { savedAt: unknown }).savedAt === "number" &&
    "value" in value
  );
}

export function readCache<T>(key: string, ttlMs: number = THIRTY_MINUTES_MS): CacheHit<T> | null {
  const raw = storageGet(key);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isEnvelope<T>(parsed)) return null;
    return {
      value: parsed.value,
      savedAt: parsed.savedAt,
      isStale: Date.now() - parsed.savedAt > ttlMs,
    };
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, value: T): void {
  const envelope: CacheEnvelope<T> = { savedAt: Date.now(), value };
  storageSet(key, JSON.stringify(envelope));
}

/**
 * Get a fresh value from cache, or fetch and store it. If fetching fails and a
 * stale value exists, the stale value is returned with `isStale: true` so the
 * UI can show an offline/stale notice instead of an error.
 */
export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = THIRTY_MINUTES_MS,
): Promise<CacheHit<T>> {
  const hit = readCache<T>(key, ttlMs);
  if (hit && !hit.isStale) return hit;

  try {
    const value = await fetcher();
    writeCache(key, value);
    return { value, savedAt: Date.now(), isStale: false };
  } catch (error) {
    if (hit) return hit; // stale but better than nothing
    throw error;
  }
}
