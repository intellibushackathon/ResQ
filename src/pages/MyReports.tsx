import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { IncidentMap } from "../components/maps/IncidentMap";
import { Badge } from "../components/ui/Badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/Card";
import { formatConfidence } from "../lib/confidence";
import {
  REPORT_STATUS_STAGES,
  type DisasterReport,
  type ReportStatus,
  formatTimeAgo,
  getProgressPercent,
  statusBadgeVariant,
  toDisplayCoordinate,
} from "../lib/reporting";
import { useAuthStore } from "../store/useAuthStore";
import { useReportStore } from "../store/useReportStore";

export function MyReports() {
  const session = useAuthStore((state) => state.session);
  const reports = useReportStore((state) => state.reports);
  const isReady = useReportStore((state) => state.isReady);
  const isInitializing = useReportStore((state) => state.isInitializing);
  const queueCount = useReportStore((state) => state.offlineQueue.length);

  const [activeStatus, setActiveStatus] = useState<ReportStatus | "All">("All");
  const [selectedId, setSelectedId] = useState<string>("");

  const visibleReports = useMemo<DisasterReport[]>(() => {
    const scopedReports = reports.filter((report) => {
      if (session?.uid) {
        return report.submittedBy === session.uid || (report.isOfflineQueued && report.submittedBy === session.uid);
      }

      return report.isOfflineQueued && !report.submittedBy;
    });

    return activeStatus === "All"
      ? scopedReports
      : scopedReports.filter((report) => report.status === activeStatus);
  }, [activeStatus, reports, session?.uid]);

  useEffect(() => {
    if (!visibleReports.some((report) => report.id === selectedId)) {
      setSelectedId(visibleReports[0]?.id ?? "");
    }
  }, [selectedId, visibleReports]);

  const selected = visibleReports.find((report) => report.id === selectedId) ?? visibleReports[0] ?? null;

  if (!session?.uid && visibleReports.length === 0) {
    return (
      <Card className="p-6 sm:p-7">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <Badge>Citizen history</Badge>
            <Badge variant="outline">Account required</Badge>
          </div>
          <CardTitle className="text-3xl sm:text-[2rem]">My reports</CardTitle>
          <CardDescription className="max-w-3xl text-base leading-7">
            Sign in with your public account to see reports you submitted from this device or synced to Supabase.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-sm leading-7 text-slate-300">
            {queueCount > 0
              ? `${queueCount} queued report draft${queueCount === 1 ? "" : "s"} still exist locally, but a signed-in account is needed to view synced history.`
              : "No signed-in report history is available yet."}
          </div>
          <Link
            to="/login"
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-brand-500 px-5 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(36,145,255,0.28)] transition hover:bg-brand-400"
          >
            Sign in to view history
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
      <Card className="p-6 sm:p-7">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <Badge>Citizen history</Badge>
            <Badge variant="outline">Status browsing</Badge>
            <Badge variant="success">Progress tracking</Badge>
          </div>
          <CardTitle className="text-3xl sm:text-[2rem]">My reports</CardTitle>
          <CardDescription className="max-w-3xl text-base leading-7">
            Monitor incident progression from intake to resolution with map and case details.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="mb-5 flex flex-wrap gap-2">
            {["All", ...REPORT_STATUS_STAGES].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setActiveStatus(status as ReportStatus | "All")}
                className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                  activeStatus === status
                    ? "border-brand-400/40 bg-brand-500/16 text-brand-100"
                    : "border-white/15 bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {isInitializing && !isReady ? (
            <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
              Loading your reports...
            </p>
          ) : null}

          <div className="space-y-4">
            {visibleReports.map((report) => (
              <button
                key={report.id}
                type="button"
                onClick={() => setSelectedId(report.id)}
                className={`w-full rounded-3xl border p-4 text-left transition ${
                  selected?.id === report.id
                    ? "border-brand-400/35 bg-brand-500/12"
                    : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"
                }`}
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{report.id}</p>
                    <p className="text-lg font-semibold text-white">{report.damageType ?? "Incident"}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={statusBadgeVariant(report.status)}>{report.status}</Badge>
                    <p className="mt-2 text-xs text-slate-400">{formatTimeAgo(report.timestamp)}</p>
                  </div>
                </div>
                <p className="text-sm text-slate-300">{report.description}</p>
                <div className="mt-4 h-2 rounded-full bg-panel-900/80">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-brand-500 to-success-500"
                    style={{ width: `${getProgressPercent(report.status)}%` }}
                  />
                </div>
                {report.isOfflineQueued ? (
                  <p className="mt-3 text-xs uppercase tracking-[0.22em] text-warning-200">Queued locally</p>
                ) : null}
              </button>
            ))}

            {visibleReports.length === 0 ? (
              <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
                No reports found for this status filter.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="p-6">
        <CardHeader>
          <Badge variant="outline" className="w-fit">
            Detail and map support
          </Badge>
          <CardTitle>Selected report details</CardTitle>
          <CardDescription>Location, media, AI triage, and progress information for the active report.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {selected ? (
            <>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-sm text-slate-400">Location</p>
                <p className="mt-1 font-semibold text-white">{selected.locationName}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {toDisplayCoordinate(selected.lat)}, {toDisplayCoordinate(selected.lng)}
                </p>
              </div>

              <IncidentMap incidents={visibleReports} selectedIncidentId={selected.id} onSelectIncident={setSelectedId} />

              {selected.photoUrl ? (
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
                  <img src={selected.photoUrl} alt="Submitted incident" className="h-48 w-full object-cover" />
                </div>
              ) : null}

              {selected.ai ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-slate-400">AI triage</p>
                    <Badge variant="outline">{formatConfidence(selected.ai.confidence)}</Badge>
                  </div>
                  <p className="mt-3 text-sm text-slate-100">{selected.ai.summary}</p>
                  <p className="mt-3 text-xs leading-6 text-slate-300">{selected.ai.rationale}</p>
                  <div className="mt-4 grid gap-2">
                    {selected.ai.suggestedActions.map((action) => (
                      <div key={action} className="rounded-xl border border-white/10 bg-panel-900/60 px-3 py-2 text-sm text-slate-200">
                        {action}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-sm text-slate-400">Progress track</p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {REPORT_STATUS_STAGES.map((stage) => {
                    const reached = REPORT_STATUS_STAGES.indexOf(stage) <= REPORT_STATUS_STAGES.indexOf(selected.status);
                    return (
                      <div
                        key={stage}
                        className={`rounded-xl border px-2 py-2 text-center text-xs ${
                          reached
                            ? "border-success-400/35 bg-success-500/16 text-success-100"
                            : "border-white/10 bg-panel-900/80 text-slate-500"
                        }`}
                      >
                        {stage}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
              Select a report to inspect location and progress details.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
