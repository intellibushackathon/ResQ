import { DEFAULT_LOCATION_LABEL } from "./reporting";
import {
  getCachedGeocode,
  setCachedGeocode,
  clearGeocodeCache as clearPersistedGeocodeCache,
} from "./storage/geocode-cache-store";
import type { LocalIncidentReport } from "./types/incident";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ResolvedLocation = {
  label: string;
  lat: number;
  lng: number;
  parish: string | null;
  source: "nominatim" | "fallback";
};

type NominatimResponse = {
  display_name?: string;
  address?: Record<string, string | undefined>;
};

// ---------------------------------------------------------------------------
// In-memory cache (session-level, backed by IndexedDB for persistence)
// ---------------------------------------------------------------------------

const memoryCache = new Map<string, ResolvedLocation>();

function toCacheKey(lat: number, lng: number) {
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

// ---------------------------------------------------------------------------
// Fallback
// ---------------------------------------------------------------------------

function getFallbackLocation(lat: number, lng: number): ResolvedLocation {
  return {
    label: DEFAULT_LOCATION_LABEL,
    lat,
    lng,
    parish: null,
    source: "fallback",
  };
}

// ---------------------------------------------------------------------------
// Label building
// ---------------------------------------------------------------------------

function joinLocationParts(...parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(", ");
}

function buildBestLocationLabel(payload: NominatimResponse) {
  const address = payload.address ?? {};

  return (
    joinLocationParts(address.road, address.suburb) ||
    joinLocationParts(address.road, address.city) ||
    joinLocationParts(address.suburb, address.city) ||
    address.road ||
    address.suburb ||
    address.city ||
    address.town ||
    address.village ||
    address.county ||
    payload.display_name ||
    DEFAULT_LOCATION_LABEL
  );
}

/**
 * Extract parish from Nominatim address fields.
 * Jamaica uses "state_district" or "county" for parishes.
 */
function extractParish(payload: NominatimResponse): string | null {
  const address = payload.address ?? {};
  return address.state_district ?? address.county ?? address.state ?? null;
}

// ---------------------------------------------------------------------------
// Core Nominatim fetch (single request)
// ---------------------------------------------------------------------------

async function fetchFromNominatim(lat: number, lng: number): Promise<NominatimResponse> {
  const controller =
    typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
      ? undefined
      : new AbortController();
  const signal =
    typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
      ? AbortSignal.timeout(8000)
      : controller?.signal;

  if (controller) {
    window.setTimeout(() => controller.abort(), 8000);
  }

  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", lat.toString());
  url.searchParams.set("lon", lng.toString());
  url.searchParams.set("format", "json");
  url.searchParams.set("accept-language", "en");

  const response = await fetch(url.toString(), {
    signal,
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Reverse geocoding failed with ${response.status}`);
  }

  return (await response.json()) as NominatimResponse;
}

// ---------------------------------------------------------------------------
// reverseGeocode — backward-compatible, now IndexedDB-backed
// ---------------------------------------------------------------------------

export async function reverseGeocode(lat: number, lng: number): Promise<ResolvedLocation> {
  const cacheKey = toCacheKey(lat, lng);

  // Check in-memory cache first (fast path)
  const memoryCached = memoryCache.get(cacheKey);
  if (memoryCached) {
    return memoryCached;
  }

  // Check persistent IndexedDB cache
  try {
    const persisted = await getCachedGeocode(lat, lng);
    if (persisted) {
      const resolved: ResolvedLocation = {
        label: persisted.label,
        lat: persisted.lat,
        lng: persisted.lng,
        parish: persisted.parish,
        source: persisted.source,
      };
      memoryCache.set(cacheKey, resolved);
      return resolved;
    }
  } catch {
    // IndexedDB unavailable, continue with API call
  }

  // Fetch from Nominatim
  try {
    const payload = await fetchFromNominatim(lat, lng);
    const resolved: ResolvedLocation = {
      label: buildBestLocationLabel(payload),
      lat,
      lng,
      parish: extractParish(payload),
      source: "nominatim",
    };

    // Persist to both caches
    memoryCache.set(cacheKey, resolved);
    try {
      await setCachedGeocode(lat, lng, resolved.label, resolved.parish, "nominatim");
    } catch {
      // IndexedDB write failed, in-memory cache still works
    }

    return resolved;
  } catch {
    const fallback = getFallbackLocation(lat, lng);
    memoryCache.set(cacheKey, fallback);
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// reverseGeocodeWithRetry — retry with exponential backoff
// ---------------------------------------------------------------------------

export async function reverseGeocodeWithRetry(
  lat: number,
  lng: number,
  maxRetries: number = 3,
): Promise<ResolvedLocation> {
  const cacheKey = toCacheKey(lat, lng);

  // Check caches first
  const memoryCached = memoryCache.get(cacheKey);
  if (memoryCached && memoryCached.source === "nominatim") {
    return memoryCached;
  }

  try {
    const persisted = await getCachedGeocode(lat, lng);
    if (persisted && persisted.source === "nominatim") {
      const resolved: ResolvedLocation = {
        label: persisted.label,
        lat: persisted.lat,
        lng: persisted.lng,
        parish: persisted.parish,
        source: persisted.source,
      };
      memoryCache.set(cacheKey, resolved);
      return resolved;
    }
  } catch {
    // Continue
  }

  // Retry loop with exponential backoff
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      const delay = Math.min(1000 * 2 ** (attempt - 1), 8000);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    try {
      const payload = await fetchFromNominatim(lat, lng);
      const resolved: ResolvedLocation = {
        label: buildBestLocationLabel(payload),
        lat,
        lng,
        parish: extractParish(payload),
        source: "nominatim",
      };

      memoryCache.set(cacheKey, resolved);
      try {
        await setCachedGeocode(lat, lng, resolved.label, resolved.parish, "nominatim");
      } catch {
        // IndexedDB write failed
      }

      return resolved;
    } catch (err) {
      lastError = err;
    }
  }

  // All retries exhausted, return fallback
  console.warn("Reverse geocoding failed after retries:", lastError);
  const fallback = getFallbackLocation(lat, lng);
  memoryCache.set(cacheKey, fallback);
  return fallback;
}

// ---------------------------------------------------------------------------
// Batch resolver for reports missing addressText
// Respects Nominatim rate limit: 1 request per second
// ---------------------------------------------------------------------------

export async function resolveLocationsForReports(
  reports: LocalIncidentReport[],
): Promise<Map<string, ResolvedLocation>> {
  const results = new Map<string, ResolvedLocation>();
  const needsResolution = reports.filter(
    (r) =>
      !r.location.addressText &&
      r.location.lat != null &&
      r.location.lng != null,
  );

  for (let i = 0; i < needsResolution.length; i++) {
    const report = needsResolution[i];
    const lat = report.location.lat!;
    const lng = report.location.lng!;

    // Rate limit: wait 1100ms between requests (Nominatim policy)
    if (i > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1100));
    }

    const resolved = await reverseGeocode(lat, lng);
    results.set(report.id, resolved);
  }

  return results;
}

// ---------------------------------------------------------------------------
// Cache management
// ---------------------------------------------------------------------------

export function clearReverseGeocodeCache() {
  memoryCache.clear();
  void clearPersistedGeocodeCache();
}

export async function clearAllGeocodeCaches(): Promise<void> {
  memoryCache.clear();
  await clearPersistedGeocodeCache();
}
