import { useEffect } from "react";
import L, { type DivIcon } from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { cn } from "../../lib/utils";
import {
  type DisasterReport,
  type Severity,
  DEFAULT_LOCATION_LABEL,
  formatTimeAgo,
  toDisplayCoordinate,
} from "../../lib/reporting";
import { KINGSTON_FALLBACK } from "../../lib/geolocation";

type IncidentMapProps = {
  incidents: DisasterReport[];
  selectedIncidentId?: string | null;
  center?: {
    lat: number;
    lng: number;
  };
  zoom?: number;
  onSelectIncident?: (incidentId: string) => void;
  className?: string;
};

const severityClassMap: Record<Severity, string> = {
  Critical: "critical",
  High: "high",
  Medium: "medium",
  Low: "low",
};

const iconCache = new Map<string, DivIcon>();

function getIncidentMarkerIcon(severity: Severity, isSelected: boolean) {
  const key = `${severity}-${isSelected ? "selected" : "base"}`;
  const cached = iconCache.get(key);
  if (cached) {
    return cached;
  }

  const icon = L.divIcon({
    className: "",
    html: `<span class="incident-map__marker incident-map__marker--${severityClassMap[severity]}${isSelected ? " incident-map__marker--selected" : ""}"></span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  iconCache.set(key, icon);
  return icon;
}

function RecenterOnSelection({
  incidents,
  selectedIncidentId,
}: Pick<IncidentMapProps, "incidents" | "selectedIncidentId">) {
  const map = useMap();

  useEffect(() => {
    if (!selectedIncidentId) return;
    const incident = incidents.find((entry) => entry.id === selectedIncidentId);
    if (!incident) return;

    map.flyTo([incident.lat, incident.lng], Math.max(map.getZoom(), 12), {
      duration: 0.4,
    });
  }, [incidents, map, selectedIncidentId]);

  return null;
}

export function IncidentMap({
  incidents,
  selectedIncidentId,
  center = KINGSTON_FALLBACK,
  zoom = 12,
  onSelectIncident,
  className,
}: IncidentMapProps) {
  const initialCenter =
    incidents.find((report) => report.id === selectedIncidentId) ??
    incidents[0] ?? {
      lat: center.lat,
      lng: center.lng,
    };

  return (
    <div className={cn("map-shell h-72 w-full overflow-hidden rounded-xl", className)}>
      <MapContainer center={[initialCenter.lat, initialCenter.lng]} zoom={zoom} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RecenterOnSelection incidents={incidents} selectedIncidentId={selectedIncidentId} />

        {incidents.map((incident) => {
          const severity = incident.severity ?? "Medium";
          const isSelected = incident.id === selectedIncidentId;

          return (
            <Marker
              key={incident.id}
              position={[incident.lat, incident.lng]}
              icon={getIncidentMarkerIcon(severity, isSelected)}
              eventHandlers={{
                click: () => onSelectIncident?.(incident.id),
              }}
            >
              <Popup>
                <div className="space-y-1 text-sm text-slate-800">
                  <p className="font-semibold text-slate-900">{incident.damageType ?? "Incident"}</p>
                  <p>{incident.description}</p>
                  <p>
                    <strong>Severity:</strong> {incident.severity ?? "Unclassified"}
                  </p>
                  <p>
                    <strong>Status:</strong> {incident.status}
                  </p>
                  <p>
                    <strong>Location:</strong> {incident.locationName ?? DEFAULT_LOCATION_LABEL}
                  </p>
                  <p>
                    <strong>Updated:</strong> {formatTimeAgo(incident.timestamp)}
                  </p>
                  <p>
                    <strong>Coords:</strong> {toDisplayCoordinate(incident.lat)}, {toDisplayCoordinate(incident.lng)}
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
