import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { cn } from "../../lib/utils";
import { KINGSTON_FALLBACK } from "../../lib/geolocation";

type LocationPickerMapProps = {
  mapCenter?: {
    lat: number;
    lng: number;
  };
  incidentLocation?: {
    lat: number;
    lng: number;
  };
  onSelectLocation: (location: { lat: number; lng: number }) => void;
  className?: string;
};

const locationMarkerIcon = L.divIcon({
  className: "",
  html: '<span class="location-picker__marker"></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function RecenterOnTarget({ center }: { center: { lat: number; lng: number } }) {
  const map = useMap();

  useEffect(() => {
    map.flyTo([center.lat, center.lng], Math.max(map.getZoom(), 13), {
      duration: 0.35,
    });
  }, [center.lat, center.lng, map]);

  return null;
}

function ClickToPin({
  onSelectLocation,
}: Pick<LocationPickerMapProps, "onSelectLocation">) {
  useMapEvents({
    click(event) {
      onSelectLocation({
        lat: Number(event.latlng.lat.toFixed(6)),
        lng: Number(event.latlng.lng.toFixed(6)),
      });
    },
  });

  return null;
}

export function LocationPickerMap({
  mapCenter = KINGSTON_FALLBACK,
  incidentLocation = mapCenter,
  onSelectLocation,
  className,
}: LocationPickerMapProps) {
  return (
    <div className={cn("map-shell h-48 w-full overflow-hidden rounded-[28px]", className)}>
      <MapContainer center={[mapCenter.lat, mapCenter.lng]} zoom={13} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RecenterOnTarget center={mapCenter} />
        <ClickToPin onSelectLocation={onSelectLocation} />
        <Marker position={[incidentLocation.lat, incidentLocation.lng]} icon={locationMarkerIcon} />
      </MapContainer>
    </div>
  );
}
