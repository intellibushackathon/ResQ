import { useMemo, useRef, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { KINGSTON_FALLBACK } from "../lib/geolocation";
import { cn } from "../lib/utils";

/* ─── Data model ─── */

type ZoneStatus = "open" | "full" | "closed";

type SafeZone = {
  id: string;
  name: string;
  parish: string;
  type: string;
  capacity: number;
  occupancy: number;
  status: ZoneStatus;
  lat: number;
  lng: number;
  amenities: string[];
  contact: string;
};

const SAFE_ZONES: SafeZone[] = [
  {
    id: "sz-1",
    name: "National Arena Shelter",
    parish: "Kingston",
    type: "Primary Shelter",
    capacity: 1200,
    occupancy: 340,
    status: "open",
    lat: 18.0058,
    lng: -76.7872,
    amenities: ["Medical", "Water", "Power", "Food"],
    contact: "876-555-0101",
  },
  {
    id: "sz-2",
    name: "Portmore Community Refuge",
    parish: "St. Catherine",
    type: "Flood Fallback",
    capacity: 800,
    occupancy: 780,
    status: "open",
    lat: 17.9536,
    lng: -76.8793,
    amenities: ["Water", "Food", "Sanitation"],
    contact: "876-555-0102",
  },
  {
    id: "sz-3",
    name: "Montego Bay Civic Hall",
    parish: "St. James",
    type: "Storm Shelter",
    capacity: 650,
    occupancy: 650,
    status: "full",
    lat: 18.4762,
    lng: -77.8939,
    amenities: ["Medical", "Water", "Power"],
    contact: "876-555-0103",
  },
  {
    id: "sz-4",
    name: "Mandeville Parish Hub",
    parish: "Manchester",
    type: "Assembly Point",
    capacity: 500,
    occupancy: 120,
    status: "open",
    lat: 18.0419,
    lng: -77.5033,
    amenities: ["Water", "Sanitation"],
    contact: "876-555-0104",
  },
  {
    id: "sz-5",
    name: "Ocho Rios Community Centre",
    parish: "St. Ann",
    type: "Primary Shelter",
    capacity: 900,
    occupancy: 0,
    status: "closed",
    lat: 18.4074,
    lng: -77.1004,
    amenities: ["Medical", "Water", "Power", "Food", "Sanitation"],
    contact: "876-555-0105",
  },
  {
    id: "sz-6",
    name: "Spanish Town Civic Centre",
    parish: "St. Catherine",
    type: "Flood Fallback",
    capacity: 700,
    occupancy: 210,
    status: "open",
    lat: 18.0094,
    lng: -76.9553,
    amenities: ["Water", "Food"],
    contact: "876-555-0106",
  },
  {
    id: "sz-7",
    name: "May Pen Relief Station",
    parish: "Clarendon",
    type: "Assembly Point",
    capacity: 400,
    occupancy: 395,
    status: "open",
    lat: 17.9691,
    lng: -77.2436,
    amenities: ["Water", "Sanitation", "Food"],
    contact: "876-555-0107",
  },
  {
    id: "sz-8",
    name: "Savanna-la-Mar Hall",
    parish: "Westmoreland",
    type: "Storm Shelter",
    capacity: 550,
    occupancy: 0,
    status: "closed",
    lat: 18.2147,
    lng: -78.1316,
    amenities: ["Medical", "Water", "Power"],
    contact: "876-555-0108",
  },
];

/* ─── Helpers ─── */

const statusConfig: Record<ZoneStatus, { label: string; variant: "success" | "warning" | "danger" }> = {
  open: { label: "Open", variant: "success" },
  full: { label: "At Capacity", variant: "warning" },
  closed: { label: "Closed", variant: "danger" },
};

function occupancyPercent(zone: SafeZone) {
  return Math.min(Math.round((zone.occupancy / zone.capacity) * 100), 100);
}

function occupancyBarColor(pct: number) {
  if (pct >= 95) return "bg-danger-500";
  if (pct >= 70) return "bg-warning-500";
  return "bg-success-500";
}

/* ─── Map marker ─── */

const markerIconCache = new Map<ZoneStatus, L.DivIcon>();

function getZoneMarkerIcon(status: ZoneStatus) {
  const cached = markerIconCache.get(status);
  if (cached) return cached;

  const colorMap: Record<ZoneStatus, string> = {
    open: "#16c784",
    full: "#ffb020",
    closed: "#ff5b73",
  };

  const icon = L.divIcon({
    className: "",
    html: `<span style="display:block;width:14px;height:14px;border-radius:999px;background:${colorMap[status]};border:2px solid rgba(248,250,252,0.9);box-shadow:0 0 0 5px ${colorMap[status]}33;"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

  markerIconCache.set(status, icon);
  return icon;
}

/* ─── Component ─── */

export function SafeZones() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return SAFE_ZONES;
    const q = searchQuery.toLowerCase();
    return SAFE_ZONES.filter(
      (z) =>
        z.name.toLowerCase().includes(q) ||
        z.parish.toLowerCase().includes(q) ||
        z.type.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  const openCount = SAFE_ZONES.filter((z) => z.status === "open").length;
  const totalCapacity = SAFE_ZONES.reduce((sum, z) => sum + z.capacity, 0);
  const totalOccupancy = SAFE_ZONES.reduce((sum, z) => sum + z.occupancy, 0);

  function handleMarkerClick(id: string) {
    setSelectedId(id);
    const el = cardRefs.current[id];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="mb-1 font-display text-3xl tracking-tight text-white">Safe Zones</h1>
        <p className="text-sm text-slate-400">Emergency shelters and assembly points across Jamaica</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-center">
          <p className="text-2xl font-bold text-success-400">{openCount}</p>
          <p className="text-[11px] font-medium text-slate-500">Sites Open</p>
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-center">
          <p className="text-2xl font-bold text-white">{totalCapacity.toLocaleString()}</p>
          <p className="text-[11px] font-medium text-slate-500">Total Capacity</p>
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-center">
          <p className="text-2xl font-bold text-brand-400">{totalOccupancy.toLocaleString()}</p>
          <p className="text-[11px] font-medium text-slate-500">Currently Sheltered</p>
        </div>
      </div>

      {/* Map */}
      <div className="map-shell h-64 w-full overflow-hidden rounded-[28px]">
        <MapContainer
          center={[KINGSTON_FALLBACK.lat, KINGSTON_FALLBACK.lng]}
          zoom={9}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {SAFE_ZONES.map((zone) => (
            <Marker
              key={zone.id}
              position={[zone.lat, zone.lng]}
              icon={getZoneMarkerIcon(zone.status)}
              eventHandlers={{ click: () => handleMarkerClick(zone.id) }}
            >
              <Popup>
                <div className="space-y-0.5 text-sm text-slate-800">
                  <p className="font-semibold text-slate-900">{zone.name}</p>
                  <p>{zone.parish} &middot; {zone.type}</p>
                  <p><strong>Status:</strong> {statusConfig[zone.status].label}</p>
                  <p><strong>Capacity:</strong> {zone.occupancy}/{zone.capacity}</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        <input
          type="text"
          placeholder="Search shelters by name, parish, or type..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none transition focus:border-brand-400/40 focus:bg-white/[0.06]"
        />
      </div>

      {/* Zone cards */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-slate-500">No shelters match your search.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((zone) => {
            const pct = occupancyPercent(zone);
            const cfg = statusConfig[zone.status];
            const isSelected = selectedId === zone.id;

            return (
              <div
                key={zone.id}
                ref={(el) => { cardRefs.current[zone.id] = el; }}
              >
              <Card
                className={cn(
                  "cursor-pointer p-5 transition-all duration-300",
                  isSelected && "ring-1 ring-brand-400/40",
                )}
                onClick={() => setSelectedId(zone.id === selectedId ? null : zone.id)}
              >
                {/* Top row: name + status */}
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold text-white">{zone.name}</h3>
                    <p className="mt-0.5 text-xs text-slate-400">{zone.parish} &middot; {zone.type}</p>
                  </div>
                  <Badge variant={cfg.variant} className="shrink-0">{cfg.label}</Badge>
                </div>

                {/* Capacity bar */}
                <div className="mb-3">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Occupancy</span>
                    <span className="font-semibold text-white">
                      {zone.occupancy.toLocaleString()} / {zone.capacity.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/8">
                    <div
                      className={cn("h-full rounded-full transition-all duration-500", occupancyBarColor(pct))}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-right text-[10px] text-slate-500">{pct}% utilized</p>
                </div>

                {/* Amenities */}
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {zone.amenities.map((a) => (
                    <span
                      key={a}
                      className="rounded-full border border-white/[0.06] bg-white/[0.03] px-2.5 py-0.5 text-[10px] font-medium text-slate-300"
                    >
                      {a}
                    </span>
                  ))}
                </div>

                {/* Footer: contact + directions */}
                <div className="flex items-center justify-between border-t border-white/[0.06] pt-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                    </svg>
                    <span>{zone.contact}</span>
                  </div>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${zone.lat},${zone.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-semibold text-brand-400 transition hover:text-brand-300"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
                    </svg>
                    Directions
                  </a>
                </div>
              </Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
