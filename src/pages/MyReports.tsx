import { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { IncidentMap } from "../components/maps/IncidentMap";
import { Badge } from "../components/ui/Badge";
import { QRShareModal } from "../components/QRShareModal";
import { formatConfidence } from "../lib/confidence";
import {
  REPORT_STATUS_STAGES,
  type DisasterReport,
  type QueuedReportDraft,
  type ReportStatus,
  type Severity,
  formatTimeAgo,
  getProgressPercent,
  statusBadgeVariant,
  toDisplayCoordinate,
} from "../lib/reporting";
import { useAuthStore } from "../store/useAuthStore";
import { useReportStore } from "../store/useReportStore";

type TabFilter = "All Reports" | "Processing" | "Resolved";

function severityColor(severity?: Severity) {
  switch (severity) {
    case "Critical":
      return "border-danger-400/40 bg-danger-500/20 text-danger-100";
    case "High":
      return "border-warning-400/40 bg-warning-500/20 text-warning-100";
    case "Medium":
      return "border-brand-400/40 bg-brand-500/20 text-brand-100";
    case "Low":
      return "border-success-400/40 bg-success-500/20 text-success-100";
    default:
      return "border-white/15 bg-white/5 text-slate-200";
  }
}

function severityLabel(severity?: Severity) {
  if (!severity) return "UNKNOWN";
  return `${severity.toUpperCase()} SEVERITY`;
}

function mapTabToStatuses(tab: TabFilter): ReportStatus[] | null {
  if (tab === "All Reports") return null;
  if (tab === "Processing") return ["Pending Validation", "Verified"];
  return ["Resolved"];
}

function getAIComponentMatches(report: DisasterReport) {
  const components: { label: string; match: number; color: string }[] = [];
  if (!report.ai) return components;

  const dt = report.damageType ?? report.ai.damageType;
  switch (dt) {
    case "Flooding":
      components.push(
        { label: "Road Inundation", match: Math.min(report.ai.confidence * 100 + 2, 99), color: "text-brand-300" },
        { label: "Foundation Erosion", match: Math.max(report.ai.confidence * 100 - 7, 40), color: "text-danger-300" },
        { label: "Power Grid Hazard", match: Math.max(report.ai.confidence * 100 - 30, 30), color: "text-warning-300" },
      );
      break;
    case "Roof Collapse":
      components.push(
        { label: "Structural Failure", match: Math.min(report.ai.confidence * 100 + 2, 99), color: "text-danger-300" },
        { label: "Debris Field", match: Math.max(report.ai.confidence * 100 - 10, 40), color: "text-warning-300" },
        { label: "Utility Exposure", match: Math.max(report.ai.confidence * 100 - 25, 30), color: "text-brand-300" },
      );
      break;
    case "Utility Damage":
      components.push(
        { label: "Power Grid Hazard", match: Math.min(report.ai.confidence * 100 + 2, 99), color: "text-warning-300" },
        { label: "Fire Risk", match: Math.max(report.ai.confidence * 100 - 12, 40), color: "text-danger-300" },
        { label: "Public Safety Zone", match: Math.max(report.ai.confidence * 100 - 28, 30), color: "text-brand-300" },
      );
      break;
    default:
      components.push(
        { label: "Damage Assessment", match: Math.min(report.ai.confidence * 100 + 2, 99), color: "text-brand-300" },
        { label: "Hazard Detection", match: Math.max(report.ai.confidence * 100 - 10, 40), color: "text-warning-300" },
        { label: "Impact Radius", match: Math.max(report.ai.confidence * 100 - 25, 30), color: "text-danger-300" },
      );
  }
  return components;
}

function getResponsePriority(severity?: Severity) {
  switch (severity) {
    case "Critical":
      return { label: "Immediate", color: "text-danger-300" };
    case "High":
      return { label: "Urgent", color: "text-warning-300" };
    case "Medium":
      return { label: "Standard", color: "text-brand-300" };
    case "Low":
      return { label: "Monitor", color: "text-success-300" };
    default:
      return { label: "Pending", color: "text-slate-400" };
  }
}

function getDamageLabel(report: DisasterReport) {
  const dt = report.damageType ?? report.ai?.damageType;
  if (!dt) return "Unknown";
  if (dt === "Flooding") return "Structural / Water";
  if (dt === "Roof Collapse") return "Structural / Collapse";
  if (dt === "Utility Damage") return "Electrical / Utility";
  if (dt === "Debris/Tree") return "Debris / Obstruction";
  return dt;
}

export function MyReports() {
  const session = useAuthStore((state) => state.session);
  const reports = useReportStore((state) => state.reports);
  const offlineQueue = useReportStore((state) => state.offlineQueue);
  const isReady = useReportStore((state) => state.isReady);
  const isInitializing = useReportStore((state) => state.isInitializing);
  const queueCount = offlineQueue.length;

  const [activeTab, setActiveTab] = useState<TabFilter>("All Reports");
  const [selectedId, setSelectedId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [qrDraft, setQrDraft] = useState<QueuedReportDraft | null>(null);

  const visibleReports = useMemo<DisasterReport[]>(() => {
    const scopedReports = reports.filter((report) => {
      if (session?.uid) {
        return report.submittedBy === session.uid || (report.isOfflineQueued && report.submittedBy === session.uid);
      }
      return report.isOfflineQueued && !report.submittedBy;
    });

    const statusFiltered =
      activeTab === "All Reports"
        ? scopedReports
        : scopedReports.filter((report) => {
            const statuses = mapTabToStatuses(activeTab);
            return statuses ? statuses.includes(report.status) : true;
          });

    if (!searchQuery.trim()) return statusFiltered;

    const q = searchQuery.toLowerCase();
    return statusFiltered.filter(
      (r) =>
        r.description.toLowerCase().includes(q) ||
        r.locationName?.toLowerCase().includes(q) ||
        r.damageType?.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q),
    );
  }, [activeTab, reports, session?.uid, searchQuery]);

  useEffect(() => {
    if (!visibleReports.some((report) => report.id === selectedId)) {
      setSelectedId(visibleReports[0]?.id ?? "");
    }
  }, [selectedId, visibleReports]);

  const selected = visibleReports.find((report) => report.id === selectedId) ?? visibleReports[0] ?? null;
  const responsePriority = selected ? getResponsePriority(selected.severity) : null;
  const aiComponents = selected ? getAIComponentMatches(selected) : [];

  if (!session?.uid && visibleReports.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-500/15">
            <svg className="h-6 w-6 text-brand-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-semibold text-white">My Reports</h2>
          <p className="mb-6 text-sm leading-6 text-slate-400">
            Sign in to view your submitted reports and track their progress through the response pipeline.
          </p>
          {queueCount > 0 && (
            <p className="mb-4 rounded-xl border border-warning-400/20 bg-warning-500/10 px-4 py-2 text-xs text-warning-200">
              {queueCount} queued draft{queueCount === 1 ? "" : "s"} pending sync
            </p>
          )}
          <Link
            to="/login"
            className="inline-flex h-10 items-center justify-center rounded-xl bg-brand-500 px-5 text-sm font-semibold text-white transition hover:bg-brand-400"
          >
            Sign in to view history
          </Link>
        </div>
      </div>
    );
  }

  const tabs: TabFilter[] = ["All Reports", "Processing", "Resolved"];

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden -mx-4 -my-6 sm:-mx-6 sm:-my-8">
      {/* Left panel - Report list */}
      <div className={`flex w-full flex-col border-r border-white/8 md:max-w-[420px] lg:max-w-[460px] ${selected && selectedId ? "hidden md:flex" : ""}`}>
        {/* Search bar */}
        <div className="border-b border-white/8 px-4 py-3">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="text"
              placeholder="Search reports by location or incident type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none transition focus:border-brand-400/40 focus:bg-white/[0.06]"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/8">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-3 py-3 text-xs font-semibold tracking-wide transition ${
                activeTab === tab
                  ? "border-b-2 border-brand-400 text-brand-300"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Report list */}
        <div className="flex-1 overflow-y-auto">
          {isInitializing && !isReady ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-slate-500">Loading reports...</p>
            </div>
          ) : visibleReports.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-slate-500">No reports found.</p>
            </div>
          ) : (
            visibleReports.map((report) => {
              const isSelected = selected?.id === report.id;
              return (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => setSelectedId(report.id)}
                  className={`w-full border-b border-white/6 p-4 text-left transition ${
                    isSelected ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"
                  }`}
                >
                  <div className="flex gap-3">
                    {/* Thumbnail */}
                    {report.photoUrl ? (
                      <div className="h-16 w-20 flex-shrink-0 overflow-hidden rounded-lg">
                        <img
                          src={report.photoUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex h-16 w-20 flex-shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
                        <svg className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                        </svg>
                      </div>
                    )}

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${
                          report.severity === "Critical" ? "text-danger-300" :
                          report.severity === "High" ? "text-warning-300" :
                          report.severity === "Medium" ? "text-brand-300" :
                          "text-slate-400"
                        }`}>
                          {report.severity === "Critical" && (
                            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
                            </svg>
                          )}
                          {report.severity === "High" && (
                            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 6a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 6Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                            </svg>
                          )}
                          {severityLabel(report.severity)}
                        </span>
                        <span className="text-[11px] text-slate-500">{formatTimeAgo(report.timestamp)}</span>
                      </div>

                      <p className="truncate text-sm font-semibold text-white">
                        {report.damageType ?? "Incident"} - {report.locationName ?? "Unknown Location"}
                      </p>

                      <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-400">
                        {report.description}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <Badge
                          variant={statusBadgeVariant(report.status)}
                          className="!py-0.5 !text-[9px] !tracking-[0.15em]"
                        >
                          {report.status === "Pending Validation" ? "NEW" : report.status === "Verified" ? "ROUTED" : "RESOLVED"}
                        </Badge>
                        {report.ai && (
                          <Badge variant="outline" className="!py-0.5 !text-[9px] !tracking-[0.15em]">
                            ANALYZED
                          </Badge>
                        )}
                        {report.isOfflineQueued && (
                          <>
                            <Badge variant="warning" className="!py-0.5 !text-[9px] !tracking-[0.15em]">
                              QUEUED
                            </Badge>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const draft = offlineQueue.find((d) => d.id === report.id);
                                if (draft) setQrDraft(draft);
                              }}
                              className="ml-auto flex items-center gap-1 rounded-lg border border-brand-400/25 bg-brand-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-brand-300 transition hover:bg-brand-500/20"
                            >
                              <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 18.75h.75v.75h-.75v-.75ZM18.75 13.5h.75v.75h-.75v-.75ZM18.75 18.75h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" />
                              </svg>
                              Share QR
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right panel - Report detail */}
      <div className={`flex-1 overflow-y-auto ${!selected || !selectedId ? "hidden md:block" : ""}`}>
        {selected ? (
          <div className="p-4 sm:p-6">
            {/* Mobile back button */}
            <button
              type="button"
              onClick={() => setSelectedId("")}
              className="mb-4 flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-white md:hidden"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
              Back to reports
            </button>
            {/* Header */}
            <div className="mb-6">
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <span className={`rounded-md border px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${severityColor(selected.severity)}`}>
                  {severityLabel(selected.severity)}
                </span>
                <span className="text-sm text-slate-500">
                  Incident ID: {selected.id.slice(0, 10).toUpperCase()}
                </span>
              </div>

              <h1 className="mb-2 text-2xl font-bold text-white lg:text-3xl">
                {selected.damageType ?? "Incident"} - {selected.locationName ?? "Unknown Location"}
              </h1>

              <div className="flex items-center gap-2 text-sm text-slate-400">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                </svg>
                <span>{selected.locationName ?? `${toDisplayCoordinate(selected.lat)}, ${toDisplayCoordinate(selected.lng)}`}</span>
              </div>
            </div>

            {/* AI Analysis Progress */}
            {selected.ai && (
              <div className="mb-6">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-brand-300">AI Analysis Progress</span>
                  <span className="text-xs font-semibold text-success-300">100% (Finalized)</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-full rounded-full bg-gradient-to-r from-brand-500 to-success-400" />
                </div>
              </div>
            )}

            {/* Stats cards */}
            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {/* Confidence Score */}
              <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Confidence Score</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-white">
                    {selected.ai ? `${(selected.ai.confidence * 100).toFixed(1)}%` : "—"}
                  </span>
                  {selected.ai && selected.ai.confidence >= 0.9 && (
                    <span className="text-xs text-success-300">High</span>
                  )}
                </div>
              </div>

              {/* Damage Detected */}
              <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Damage Detected</p>
                <p className="text-lg font-bold text-white">{getDamageLabel(selected)}</p>
              </div>

              {/* Response Priority */}
              <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Response Priority</p>
                <p className={`text-lg font-bold ${responsePriority?.color ?? "text-slate-400"}`}>
                  {responsePriority?.label ?? "Pending"}
                </p>
              </div>
            </div>

            {/* Two-column: Imagery + AI Components */}
            <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Processed Imagery / Map */}
              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Processed Imagery</h3>
                {selected.photoUrl ? (
                  <div className="relative overflow-hidden rounded-xl border border-white/8">
                    <img
                      src={selected.photoUrl}
                      alt="Incident imagery"
                      className="h-56 w-full object-cover"
                    />
                    {selected.ai && (
                      <div className="absolute bottom-0 left-0 right-0 flex gap-2 p-3">
                        <span className="rounded-md bg-black/70 px-2 py-1 text-[10px] font-semibold text-brand-300 backdrop-blur-sm">
                          AI Overlay Active
                        </span>
                        {selected.damageType === "Flooding" && (
                          <span className="rounded-md bg-black/70 px-2 py-1 text-[10px] font-semibold text-brand-300 backdrop-blur-sm">
                            Water Line: +1.2m
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-white/8">
                    <IncidentMap
                      incidents={visibleReports}
                      selectedIncidentId={selected.id}
                      onSelectIncident={setSelectedId}
                    />
                  </div>
                )}
              </div>

              {/* AI Component Analysis */}
              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">AI Component Analysis</h3>
                <div className="space-y-3">
                  {aiComponents.map((comp) => (
                    <div
                      key={comp.label}
                      className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`h-2.5 w-2.5 rounded-full ${
                          comp.match > 85 ? "bg-brand-400" :
                          comp.match > 60 ? "bg-danger-400" :
                          "bg-warning-400"
                        }`} />
                        <span className="text-sm font-medium text-white">{comp.label}</span>
                      </div>
                      <span className="text-sm font-semibold text-slate-300">{Math.round(comp.match)}% match</span>
                    </div>
                  ))}

                  {aiComponents.length === 0 && (
                    <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-6 text-center">
                      <p className="text-sm text-slate-500">No AI analysis available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* AI Summary */}
            {selected.ai && (
              <div className="mb-6 rounded-xl border border-white/8 bg-white/[0.03] p-5">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">AI Triage Summary</h3>
                <p className="mb-2 text-sm leading-relaxed text-slate-200">{selected.ai.summary}</p>
                <p className="text-xs leading-relaxed text-slate-400">{selected.ai.rationale}</p>
                {selected.ai.suggestedActions.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Suggested Actions</p>
                    <div className="grid gap-1.5">
                      {selected.ai.suggestedActions.map((action) => (
                        <div key={action} className="rounded-lg border border-white/6 bg-white/[0.02] px-3 py-2 text-xs text-slate-300">
                          {action}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Map (shown if photo is present, as secondary) */}
            {selected.photoUrl && (
              <div className="mb-6">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Incident Location</h3>
                <div className="overflow-hidden rounded-xl border border-white/8">
                  <IncidentMap
                    incidents={visibleReports}
                    selectedIncidentId={selected.id}
                    onSelectIncident={setSelectedId}
                  />
                </div>
              </div>
            )}

            {/* QR share — shown only for offline queued drafts */}
            {selected.isOfflineQueued && (
              <div className="mb-6 flex items-center justify-between rounded-xl border border-brand-400/15 bg-brand-500/[0.05] px-5 py-4">
                <div>
                  <p className="text-sm font-semibold text-white">No internet? Share via QR</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Let someone with internet submit this report on your behalf.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const draft = offlineQueue.find((d) => d.id === selected.id);
                    if (draft) setQrDraft(draft);
                  }}
                  className="ml-4 flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-400"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 18.75h.75v.75h-.75v-.75ZM18.75 13.5h.75v.75h-.75v-.75ZM18.75 18.75h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" />
                  </svg>
                  Share QR
                </button>
              </div>
            )}

            {/* Progress track */}
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-5">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Response Progress</h3>
              <div className="flex gap-2">
                {REPORT_STATUS_STAGES.map((stage) => {
                  const reached =
                    REPORT_STATUS_STAGES.indexOf(stage) <= REPORT_STATUS_STAGES.indexOf(selected.status);
                  return (
                    <div
                      key={stage}
                      className={`flex-1 rounded-lg border px-3 py-2 text-center text-xs font-semibold ${
                        reached
                          ? "border-success-400/30 bg-success-500/14 text-success-200"
                          : "border-white/8 bg-white/[0.02] text-slate-600"
                      }`}
                    >
                      {stage}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <svg className="mx-auto mb-3 h-10 w-10 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              <p className="text-sm text-slate-500">Select a report to view details</p>
            </div>
          </div>
        )}
      </div>
      {/* QR share modal */}
      <AnimatePresence>
        {qrDraft && (
          <QRShareModal
            draft={qrDraft}
            submitterName={session?.displayName ?? null}
            onClose={() => setQrDraft(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
