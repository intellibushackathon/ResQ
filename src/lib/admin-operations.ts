import type { DisasterReport, Severity } from "./reporting";
import { SEVERITY_WEIGHT } from "./reporting";
import type {
  LocalIncidentReport,
  IncidentProgression,
  SourceChannel,
  DashboardIncidentView,
} from "./types/incident";

// ---------------------------------------------------------------------------
// Incident progression mapping from legacy alert states
// ---------------------------------------------------------------------------

export function getIncidentProgression(report: DisasterReport): IncidentProgression {
  if (report.alertState === "resolved" || report.status === "Resolved") return "resolved";
  if (report.alertState === "dispatched") return "en_route";
  if (report.alertState === "acknowledged" || report.status === "Verified") return "assigned";
  return "unassigned";
}

export function getIncidentsByProgression(
  reports: DisasterReport[],
): Record<IncidentProgression, DisasterReport[]> {
  const result: Record<IncidentProgression, DisasterReport[]> = {
    unassigned: [],
    assigned: [],
    en_route: [],
    on_scene: [],
    resolved: [],
    cancelled: [],
    failed: [],
    escalated: [],
  };

  for (const report of reports) {
    const progression = getIncidentProgression(report);
    result[progression].push(report);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Source channel grouping
// ---------------------------------------------------------------------------

export function inferSourceChannel(report: DisasterReport): SourceChannel {
  if (report.isOfflineQueued) return "offline_sync";
  return "online_direct";
}

export function getIncidentsBySourceChannel(
  reports: DisasterReport[],
): Record<SourceChannel, DisasterReport[]> {
  const result: Record<SourceChannel, DisasterReport[]> = {
    online_direct: [],
    offline_sync: [],
    mesh_gateway: [],
  };

  for (const report of reports) {
    const channel = inferSourceChannel(report);
    result[channel].push(report);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Dashboard flag helpers
// ---------------------------------------------------------------------------

export function getDuplicateCandidates(reports: DisasterReport[]): DisasterReport[] {
  // Simple proximity-based duplicate detection
  // Reports within 100m and same damage type within 1 hour are candidates
  const candidates: DisasterReport[] = [];
  const checked = new Set<string>();

  for (let i = 0; i < reports.length; i++) {
    if (checked.has(reports[i].id)) continue;

    for (let j = i + 1; j < reports.length; j++) {
      if (checked.has(reports[j].id)) continue;

      const a = reports[i];
      const b = reports[j];

      // Same damage type
      if (a.damageType !== b.damageType) continue;

      // Within 1 hour
      const timeDiff = Math.abs(Date.parse(a.timestamp) - Date.parse(b.timestamp));
      if (timeDiff > 60 * 60 * 1000) continue;

      // Within ~100m (rough lat/lng check)
      const latDiff = Math.abs(a.lat - b.lat);
      const lngDiff = Math.abs(a.lng - b.lng);
      if (latDiff < 0.001 && lngDiff < 0.001) {
        if (!checked.has(a.id)) {
          candidates.push(a);
          checked.add(a.id);
        }
        if (!checked.has(b.id)) {
          candidates.push(b);
          checked.add(b.id);
        }
      }
    }
  }

  return candidates;
}

export function getEscalatedIncidents(reports: DisasterReport[]): DisasterReport[] {
  return reports.filter(
    (r) =>
      r.severity === "Critical" &&
      r.status !== "Resolved" &&
      r.alertState !== "resolved",
  );
}

export function getReportsRequiringReview(reports: DisasterReport[]): DisasterReport[] {
  return reports.filter(
    (r) =>
      r.status === "Pending Validation" &&
      r.alertState === "new",
  );
}

// ---------------------------------------------------------------------------
// Heatmap data extraction
// ---------------------------------------------------------------------------

export function getHeatmapPoints(
  reports: DisasterReport[],
): Array<{ lat: number; lng: number; intensity: number }> {
  return reports
    .filter(
      (r) =>
        Number.isFinite(r.lat) &&
        Number.isFinite(r.lng) &&
        r.lat !== 0 &&
        r.lng !== 0,
    )
    .map((r) => ({
      lat: r.lat,
      lng: r.lng,
      intensity: r.severity ? SEVERITY_WEIGHT[r.severity] / 4 : 0.25,
    }));
}

// ---------------------------------------------------------------------------
// Responder load mapping
// ---------------------------------------------------------------------------

export function getResponderLoadMap(
  reports: DisasterReport[],
): Map<string, number> {
  const loadMap = new Map<string, number>();

  for (const report of reports) {
    if (report.verifiedBy && report.status !== "Resolved") {
      const current = loadMap.get(report.verifiedBy) ?? 0;
      loadMap.set(report.verifiedBy, current + 1);
    }
  }

  return loadMap;
}

// ---------------------------------------------------------------------------
// Status summary counts
// ---------------------------------------------------------------------------

export type IncidentStatusSummary = {
  total: number;
  pending: number;
  verified: number;
  dispatched: number;
  resolved: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
};

export function getStatusSummary(reports: DisasterReport[]): IncidentStatusSummary {
  return {
    total: reports.length,
    pending: reports.filter((r) => r.status === "Pending Validation").length,
    verified: reports.filter((r) => r.status === "Verified").length,
    dispatched: reports.filter((r) => r.alertState === "dispatched").length,
    resolved: reports.filter((r) => r.status === "Resolved").length,
    critical: reports.filter((r) => r.severity === "Critical").length,
    high: reports.filter((r) => r.severity === "High").length,
    medium: reports.filter((r) => r.severity === "Medium").length,
    low: reports.filter((r) => r.severity === "Low").length,
  };
}

// ---------------------------------------------------------------------------
// Source channel summary
// ---------------------------------------------------------------------------

export type SourceChannelSummary = {
  onlineDirect: number;
  offlineSync: number;
  meshGateway: number;
};

export function getSourceChannelSummary(reports: DisasterReport[]): SourceChannelSummary {
  const byChannel = getIncidentsBySourceChannel(reports);
  return {
    onlineDirect: byChannel.online_direct.length,
    offlineSync: byChannel.offline_sync.length,
    meshGateway: byChannel.mesh_gateway.length,
  };
}

// ---------------------------------------------------------------------------
// Progression summary
// ---------------------------------------------------------------------------

export type ProgressionSummary = Record<IncidentProgression, number>;

export function getProgressionSummary(reports: DisasterReport[]): ProgressionSummary {
  const byProgression = getIncidentsByProgression(reports);
  return {
    unassigned: byProgression.unassigned.length,
    assigned: byProgression.assigned.length,
    en_route: byProgression.en_route.length,
    on_scene: byProgression.on_scene.length,
    resolved: byProgression.resolved.length,
    cancelled: byProgression.cancelled.length,
    failed: byProgression.failed.length,
    escalated: byProgression.escalated.length,
  };
}
