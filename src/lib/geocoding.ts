import { DEFAULT_LOCATION_LABEL } from "./reporting";

export type ResolvedLocation = {
  label: string;
  lat: number;
  lng: number;
  source: "nominatim" | "fallback";
};

type NominatimResponse = {
  display_name?: string;
  address?: Record<string, string | undefined>;
};

const locationCache = new Map<string, ResolvedLocation>();

function toCacheKey(lat: number, lng: number) {
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

function getFallbackLocation(lat: number, lng: number): ResolvedLocation {
  return {
    label: DEFAULT_LOCATION_LABEL,
    lat,
    lng,
    source: "fallback",
  };
}

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

export async function reverseGeocode(lat: number, lng: number): Promise<ResolvedLocation> {
  const cacheKey = toCacheKey(lat, lng);
  const cached = locationCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
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
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Reverse geocoding failed with ${response.status}`);
    }

    const payload = (await response.json()) as NominatimResponse;
    const resolved: ResolvedLocation = {
      label: buildBestLocationLabel(payload),
      lat,
      lng,
      source: "nominatim",
    };

    locationCache.set(cacheKey, resolved);
    return resolved;
  } catch {
    const fallback = getFallbackLocation(lat, lng);
    locationCache.set(cacheKey, fallback);
    return fallback;
  }
}

export function clearReverseGeocodeCache() {
  locationCache.clear();
}
