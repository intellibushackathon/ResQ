import { useMemo, useState } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import { HeatmapLayer } from "../../components/maps/HeatmapLayer";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/Card";
import { getHeatmapPoints, getStatusSummary, getSourceChannelSummary } from "../../lib/admin-operations";
import { KINGSTON_FALLBACK } from "../../lib/geolocation";
import { useReportStore } from "../../store/useReportStore";
import type { Severity } from "../../lib/reporting";

type FilterState = {
  severity: Severity | "all";
  status: "all" | "pending" | "verified" | "dispatched" | "resolved";
  source: "all" | "online_direct" | "offline_sync" | "mesh_gateway";
};

export function AdminIncidentMap() {
  const reports = useReportStore((state) => state.reports);
  const [filter, setFilter] = useState<FilterState>({
    severity: "all",
    status: "all",
    source: "all",
  });

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (filter.severity !== "all" && r.severity !== filter.severity) return false;
      if (filter.status === "pending" && r.status !== "Pending Validation") return false;
      if (filter.status === "verified" && r.status !== "Verified") return false;
      if (filter.status === "resolved" && r.status !== "Resolved") return false;
      if (filter.status === "dispatched" && r.alertState !== "dispatched") return false;
      return true;
    });
  }, [reports, filter]);

  const heatmapPoints = useMemo(() => getHeatmapPoints(filteredReports), [filteredReports]);
  const summary = useMemo(() => getStatusSummary(filteredReports), [filteredReports]);
  const channelSummary = useMemo(() => getSourceChannelSummary(filteredReports), [filteredReports]);

  return (
    <div className="grid gap-6">
      <Card className="p-6">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="danger">Spatial View</Badge>
            <Badge variant="outline">{filteredReports.length} incidents</Badge>
          </div>
          <CardTitle>Incident Distribution Heatmap</CardTitle>
          <CardDescription>
            Spatial distribution of reported incidents. Intensity reflects severity weighting.
          </CardDescription>
        </CardHeader>

        {/* Filters */}
        <div className="mt-4 flex flex-wrap gap-3">
          <select
            value={filter.severity}
            onChange={(e) => setFilter({ ...filter, severity: e.target.value as FilterState["severity"] })}
            className="rounded-xl border border-white/15 bg-panel-900/60 px-3 py-2 text-sm text-slate-100"
          >
            <option value="all">All severities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
          <select
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value as FilterState["status"] })}
            className="rounded-xl border border-white/15 bg-panel-900/60 px-3 py-2 text-sm text-slate-100"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="dispatched">Dispatched</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        <CardContent className="mt-4">
          <div className="h-[500px] overflow-hidden rounded-xl border border-white/10">
            <MapContainer
              center={[KINGSTON_FALLBACK.lat, KINGSTON_FALLBACK.lng]}
              zoom={10}
              className="h-full w-full"
              style={{ background: "#1a1a2e" }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              <HeatmapLayer points={heatmapPoints} />
            </MapContainer>
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <CardHeader className="gap-1">
            <Badge variant="outline">By Severity</Badge>
          </CardHeader>
          <CardContent className="mt-3 space-y-2">
            {[
              { label: "Critical", count: summary.critical, color: "text-red-400" },
              { label: "High", count: summary.high, color: "text-orange-400" },
              { label: "Medium", count: summary.medium, color: "text-yellow-400" },
              { label: "Low", count: summary.low, color: "text-slate-400" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between text-sm">
                <span className={item.color}>{item.label}</span>
                <span className="font-semibold text-white">{item.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="p-5">
          <CardHeader className="gap-1">
            <Badge variant="outline">By Status</Badge>
          </CardHeader>
          <CardContent className="mt-3 space-y-2">
            {[
              { label: "Pending", count: summary.pending },
              { label: "Verified", count: summary.verified },
              { label: "Dispatched", count: summary.dispatched },
              { label: "Resolved", count: summary.resolved },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between text-sm">
                <span className="text-slate-300">{item.label}</span>
                <span className="font-semibold text-white">{item.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="p-5">
          <CardHeader className="gap-1">
            <Badge variant="outline">By Source</Badge>
          </CardHeader>
          <CardContent className="mt-3 space-y-2">
            {[
              { label: "Online Direct", count: channelSummary.onlineDirect },
              { label: "Offline Sync", count: channelSummary.offlineSync },
              { label: "Mesh Gateway", count: channelSummary.meshGateway },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between text-sm">
                <span className="text-slate-300">{item.label}</span>
                <span className="font-semibold text-white">{item.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
