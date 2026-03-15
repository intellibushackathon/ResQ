import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

type HeatmapPoint = {
  lat: number;
  lng: number;
  intensity: number;
};

type HeatmapLayerProps = {
  points: HeatmapPoint[];
  radius?: number;
  blur?: number;
  maxZoom?: number;
  max?: number;
  gradient?: Record<number, string>;
};

/**
 * Leaflet heatmap layer component using leaflet.heat plugin.
 * Must be used inside a React Leaflet MapContainer.
 */
export function HeatmapLayer({
  points,
  radius = 25,
  blur = 15,
  maxZoom = 17,
  max = 1.0,
  gradient,
}: HeatmapLayerProps) {
  const map = useMap();

  useEffect(() => {
    if (!map || points.length === 0) return;

    const heatData: Array<[number, number, number]> = points.map((p) => [
      p.lat,
      p.lng,
      p.intensity,
    ]);

    const heatLayer = (L as unknown as {
      heatLayer: (
        data: Array<[number, number, number]>,
        options: Record<string, unknown>,
      ) => L.Layer;
    }).heatLayer(heatData, {
      radius,
      blur,
      maxZoom,
      max,
      gradient: gradient ?? {
        0.0: "#3b82f6",
        0.25: "#22d3ee",
        0.5: "#fbbf24",
        0.75: "#f97316",
        1.0: "#ef4444",
      },
    });

    heatLayer.addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, points, radius, blur, maxZoom, max, gradient]);

  return null;
}
