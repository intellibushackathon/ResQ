export const KINGSTON_FALLBACK = {
  lat: 18.0179,
  lng: -76.8099,
};

export type ResolvedCoordinates = {
  lat: number;
  lng: number;
  isFallback: boolean;
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
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: roundCoordinate(position.coords.latitude),
          lng: roundCoordinate(position.coords.longitude),
          isFallback: false,
        });
      },
      () => {
        resolve({
          ...KINGSTON_FALLBACK,
          isFallback: true,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
      },
    );
  });
}
