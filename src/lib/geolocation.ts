export const KINGSTON_FALLBACK = {
  lat: 18.0179,
  lng: -76.8099,
};

/** Max acceptable accuracy in metres — reject very coarse IP-based fixes. */
const MAX_ACCURACY_METRES = 5000;

export type ResolvedCoordinates = {
  lat: number;
  lng: number;
  isFallback: boolean;
  accuracy?: number;
  error?: string;
};

export function roundCoordinate(value: number) {
  return Number(value.toFixed(6));
}

export function getCurrentLocation(): Promise<ResolvedCoordinates> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({
        ...KINGSTON_FALLBACK,
        isFallback: true,
        error: "Failed to locate.",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const accuracy = position.coords.accuracy;

        // Reject IP-based / coarse locations
        if (accuracy > MAX_ACCURACY_METRES) {
          resolve({
            ...KINGSTON_FALLBACK,
            isFallback: true,
            error: "Failed to locate.",
          });
          return;
        }

        resolve({
          lat: roundCoordinate(position.coords.latitude),
          lng: roundCoordinate(position.coords.longitude),
          isFallback: false,
          accuracy,
        });
      },
      () => {
        resolve({
          ...KINGSTON_FALLBACK,
          isFallback: true,
          error: "Failed to locate.",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    );
  });
}
