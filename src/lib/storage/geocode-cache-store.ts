import { getDb, GEOCODE_CACHE_STORE, type CachedGeocode } from "./db";

// ---------------------------------------------------------------------------
// Cache key generation (matches legacy geocoding.ts rounding)
// ---------------------------------------------------------------------------

function toCacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

// ---------------------------------------------------------------------------
// Persistent geocode cache operations
// ---------------------------------------------------------------------------

export async function getCachedGeocode(
  lat: number,
  lng: number,
): Promise<CachedGeocode | undefined> {
  const db = await getDb();
  const key = toCacheKey(lat, lng);
  return db.get(GEOCODE_CACHE_STORE, key);
}

export async function setCachedGeocode(
  lat: number,
  lng: number,
  label: string,
  parish: string | null,
  source: "nominatim" | "fallback",
): Promise<void> {
  const db = await getDb();
  const entry: CachedGeocode = {
    cacheKey: toCacheKey(lat, lng),
    label,
    parish,
    source,
    resolvedAt: new Date().toISOString(),
    lat,
    lng,
  };
  await db.put(GEOCODE_CACHE_STORE, entry);
}

export async function clearGeocodeCache(): Promise<void> {
  const db = await getDb();
  await db.clear(GEOCODE_CACHE_STORE);
}

export async function getGeocodeCacheSize(): Promise<number> {
  const db = await getDb();
  return db.count(GEOCODE_CACHE_STORE);
}

/**
 * Get all cached geocode entries. Useful for batch operations.
 */
export async function getAllCachedGeocodes(): Promise<CachedGeocode[]> {
  const db = await getDb();
  return db.getAll(GEOCODE_CACHE_STORE);
}

export { toCacheKey };
